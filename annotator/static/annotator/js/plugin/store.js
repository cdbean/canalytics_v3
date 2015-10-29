// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
    __indexOfId = function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i].id === item.id) return i; } return -1; };

Annotator.Plugin.Store = (function(_super) {
    __extends(Store, _super);

    Store.prototype.events = {
        'annotationCreated': 'annotationCreated',
        'annotationDeleted': 'annotationDeleted',
        'annotationsDeleted': 'annotationsDeleted',
        'annotationUpdated': 'annotationUpdated',
        '/annotations/created': 'annotationsCreated',
        '/annotations/updated': 'annotationsUpdated',
    };

    Store.prototype.options = {
        annotationData: {},
        emulateHTTP: false,
        loadFromSearch: false,
        prefix: '/store',
        urls: {
            create: '/annotation',
            createAll: '/annotations',
            read: '/annotations/:id',
            update: '/annotation/:id',
            updateAll: '/annotations',
            destroy: '/annotation/:id',
            destroyAll: '/annotations',
            search: '/search'
        },
    };

    function Store(element, options) {
        this._onError = __bind(this._onError, this);
        this._onLoadAnnotationsFromSearch = __bind(this._onLoadAnnotationsFromSearch, this);
        this._onLoadAnnotations = __bind(this._onLoadAnnotations, this);
        this._getAnnotations = __bind(this._getAnnotations, this);
        Store.__super__.constructor.apply(this, arguments);
        this.annotations = [];
    }

    Store.prototype.pluginInit = function() {
        if (!Annotator.supported()) {
            return;
        }
        if (this.annotator.plugins.Auth) {
            return this.annotator.plugins.Auth.withToken(this._getAnnotations);
        } else {
            return this._getAnnotations();
        }
    };

    Store.prototype._getAnnotations = function() {
        if (this.options.loadFromLocal) {
            return this.loadAnnotationsFromLocal(this.options.loadFromLocal);
        } else if (this.options.loadFromSearch) {
            return this.loadAnnotationsFromSearch(this.options.loadFromSearch);
        } else {
            return this.loadAnnotations();
        }
    };

    Store.prototype.annotationsCreated = function(annotations) {
        var to_create = [];
        var _this = this;

        for (var i = 0, len = annotations.length; i < len; i++) {
            var annotation = annotations[i];
            if (__indexOf.call(this.annotations, annotation) < 0) {
                this.registerAnnotation(annotation);
                to_create.push(annotation);
            } else {
                return this.updateAnnotation(annotation, {});
            }
        }
        this._apiRequest('createAll', to_create, function(data) {
            var annotations = data.annotations,
                entities = data.entities;
                relationships = data.relationships
            ;

            for (var i = 0, len = annotations.length; i< len; i++) {
                _this.updateAnnotation(to_create[i], annotations[i]); // assume the order of the sent annotations and returned annotations is the same
            }

            $.publish('annotation/created', annotations);
            wb.log.log({
                operation: 'created',
                item: 'annotations',
                tool: 'document',
                data: wb.log.logAnnotations(annotations),
                public: false
            });

            if (entities.length) {
                wb.log.log({
                    operation: entities[0].meta.id in wb.store.items.entities ? 'updated' : 'created',
                    item: entities[0].primary.entity_type,
                    tool: 'document',
                    data: wb.log.logItem(entities[0])
                });
                // send log if other entities are 'implicitly' created
                for (var i = 1; i < entities.length; i++) {
                    if (! (entities[i].meta.id in wb.store.items.entities)) {
                        wb.log.log({
                            operation: 'created',
                            item: entities[i].primary.entity_type,
                            tool: 'document',
                            data: wb.log.logItem(entities[i])
                        });
                    }
                }
                $.publish("entity/created", entities);
            }
            if (relationships.length) {
                wb.log.log({
                    operation: relationships[0].meta.id in wb.store.items.relationships ? 'updated' : 'created',
                    item: 'relationship',
                    tool: 'document',
                    data: wb.log.logItem(relationships[0]),
                    public: relationships[0].primary.relation === 'involve' ? false : true // involve relationship is implicit, do not show
                });
                $.publish("relationship/created", relationships);
            }
            // Annotator.showNotification(Annotator._t("Added " + annotations.length + " new annotations!"), Annotator.Notification.SUCCESS);
            wb.utility.notify(annotations.length + ' annotations added!', 'success');
        });
    };

    Store.prototype.annotationCreated = function(annotation) {
        var _this = this;
        if (__indexOf.call(this.annotations, annotation) < 0) {
            this.registerAnnotation(annotation);
            return this._apiRequest('create', annotation, function(data) {
                var ann = data.annotation,
                    entity = data.entity,
                    relationship = data.relationship
                ;
                _this.updateAnnotation(annotation, ann);

                if (entity.length) {
                    wb.log.log({
                        operation: entity[0].meta.id in wb.store.items.entities ? 'updated' : 'created',
                        item: entity[0].primary.entity_type,
                        tool: 'document',
                        data: wb.log.logItem(entity[0])
                    });
                    // send log if other entities are 'implicitly' created
                    for (var i = 1; i < entity.length; i++) {
                        if (! (entity[i].meta.id in wb.store.items.entities)) {
                            wb.log.log({
                                operation: 'created',
                                item: entity[i].primary.entity_type,
                                tool: 'document',
                                data: wb.log.logItem(entity[i])
                            });
                        }
                    }
                    $.publish('entity/created', entity);
                }
                if (relationship.length) {
                    wb.log.log({
                        operation: relationship[0].meta.id in wb.store.items.relationships ? 'updated' : 'created',
                        item: 'relationship',
                        tool: 'document',
                        data: wb.log.logItem(relationship[0]),
                        public: relationship[0].primary.relation === 'involve' ? false : true // involve relationship is implicit, do not show
                    });
                    $.publish("relationship/created", relationship);
                }

                $.publish('annotation/created', annotation);
                wb.utility.notify('Annotation created!', 'success');
                wb.log.log({
                    operation: 'created',
                    item: 'annotation',
                    tool: 'document',
                    data: wb.log.logAnnotation(annotation),
                    public: false
                });
            });
        } else {
            return this.updateAnnotation(annotation, {});
        }
    };

    Store.prototype.annotationsUpdated = function(annotations) {
        var _this = this;

        this._apiRequest('updateAll', annotations, function(data) { // just post one of the annotation, mainly to update entity
            var entities = data.entities,
                anns = data.annotations,
                relationships = data.relationships
            ;

            anns.forEach(function(ann, i) {
                $.publish('annotation/updated', anns);
                _this.updateAnnotation(annotations[i], ann);
            });
            if (!$.isEmptyObject(relationships)) {
                $.publish('relationship/updated', relationships);
                wb.log.log({
                    operation: 'updated',
                    item: 'relationship',
                    tool: 'document',
                    data: wb.log.logItem(relationships[0])
                });
            }
            if (entities.length){
                // if entity type does not change; only attributes change
                $.publish('entity/updated', entities);
                wb.log.log({
                    operation: 'updated',
                    item: entities[0].primary.entity_type,
                    tool: 'document',
                    data: wb.log.logItem(entities[0])
                });
                // send log if other entities are 'implicitly' created
                for (var i = 1; i < entities.length; i++) {
                    if (! (entities[i].meta.id in wb.store.items.entities)) {
                        wb.log.log({
                            operation: 'created',
                            item: entities[i].primary.entity_type,
                            tool: 'document',
                            data: wb.log.logItem(entities[i])
                        });
                    }
                }
            }

            wb.log.log({
                operation: 'updated',
                item: 'annotations',
                tool: 'document',
                data: wb.log.logAnnotations(anns),
                public: false,
            });
            // Annotator.showNotification(Annotator._t("Updated " + to_update.length + " annotations!"), Annotator.Notification.SUCCESS);
            wb.utility.notify(annotations.length + ' annotations updated!', 'success');
        });
    };

    Store.prototype.annotationUpdated = function(annotation) {
        var _this = this;
        if (__indexOf.call(this.annotations, annotation) >= 0) {
            return this._apiRequest('update', annotation, (function(data) {
                var ann = data.annotation,
                    entity = data.entity,
                    relationship = data.relationship
                ;
                if (relationship.length){
                    $.publish('relationship/updated', relationship);
                    wb.log.log({
                        operation: 'updated',
                        item: 'relationship',
                        tool: 'document',
                        data: wb.log.logItem(relationship[0])
                    });
                }
                if (entity.length) {
                    $.publish('entity/updated', entity);
                    wb.log.log({
                        operation: 'updated',
                        item: entity[0].primary.entity_type,
                        tool: 'document',
                        data: wb.log.logItem(entity[0])
                    });
                    // send log if other entities are 'implicitly' created
                    for (var i = 1; i < entity.length; i++) {
                        if (! (entity[i].meta.id in wb.store.items.entities)) {
                            wb.log.log({
                                operation: 'created',
                                item: entity[i].primary.entity_type,
                                tool: 'document',
                                data: wb.log.logItem(entity[i])
                            });
                        }
                    }
                }
                _this.updateAnnotation(annotation, ann);
                $.publish('annotation/updated', ann);
                wb.utility.notify('Annotation updated!', 'success');
                wb.log.log({
                    operation: 'updated',
                    item: 'annotation',
                    tool: 'document',
                    data: wb.log.logAnnotation(ann),
                    public: false,
                });
            }));
        }
    };


    Store.prototype.annotationDeleted = function(annotation) {
        var _this = this;
        if (annotation.id) { // if an annotation has no id, it is temporary annotation, no need to publish events
            this._apiRequest('destroy', annotation, function(data) {
                var annotation = data.annotation,
                    entity = data.entity,
                    relationship = data.relationship;

                wb.log.log({
                    operation: 'deleted',
                    item: 'annotation',
                    tool: 'document',
                    data: wb.log.logAnnotation(annotation),
                    public: false
                });

                _this.unregisterAnnotation(annotation);
                $.publish('annotation/deleted', annotation);
                wb.utility.notify('Annotation deleted', 'success');
            });
        } else {
            _this.unregisterAnnotation(annotation);
        }
    };


    Store.prototype.annotationsDeleted = function(annotations) {
        var _this = this;

        if (annotations.length > 0) {
            this._apiRequest('destroyAll', annotations, function(data) {
                var annotations = data.annotations,
                    entity = data.entity,
                    relationship = data.relationship;

                wb.log.log({
                    operation: 'deleted',
                    item: 'annotations',
                    tool: 'document',
                    data: wb.log.logAnnotations(annotations),
                    public: false
                });
                annotations.forEach(function(ann) {
                    _this.unregisterAnnotation(ann);
                });
                $.publish('annotation/deleted', annotations);
                // Annotator.showNotification(Annotator._t("Deleted " + to_delete.length + " annotations!"), Annotator.Notification.SUCCESS);
                wb.utility.notify(annotations.length + ' annotations deleted', 'success');
            });
        }
    };

    Store.prototype.registerAnnotation = function(annotation) {
        return this.annotations.push(annotation);
    };

    Store.prototype.unregisterAnnotation = function(annotation) {
        return this.annotations.splice(this.annotations.indexOf(annotation), 1);
        // return this.annotations.splice(__indexOfId.call(this.annotations, annotation), 1);
    };

    Store.prototype.updateAnnotation = function(annotation, data) {
        if (__indexOf.call(this.annotations, annotation) < 0) {
            console.error(Annotator._t("Trying to update unregistered annotation!"));
        } else {
            $.extend(annotation, data);
        }
        return $(annotation.highlights).data('annotation', annotation);
    };

    Store.prototype.loadAnnotations = function() {
        return this._apiRequest('read', this.options.annotationData, this._onLoadAnnotations);
    };

    Store.prototype._onLoadAnnotations = function(data) {
        var a, annotation, annotationMap, newData, _i, _j, _len, _len1, _ref;
        if (data == null) {
            data = [];
        }
        annotationMap = {};
        _ref = this.annotations;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            a = _ref[_i];
            annotationMap[a.id] = a;
        }
        newData = [];
        for (_j = 0, _len1 = data.length; _j < _len1; _j++) {
            a = data[_j];
            if (annotationMap[a.id]) {
                annotation = annotationMap[a.id];
                this.updateAnnotation(annotation, a);
            } else {
                newData.push(a);
            }
        }
        this.annotations = this.annotations.concat(newData);
        return this.annotator.loadAnnotations(newData.slice());
    };

    Store.prototype.loadAnnotationsFromSearch = function(searchOptions) {
        return this._apiRequest('search', searchOptions, this._onLoadAnnotationsFromSearch);
    };

    Store.prototype._onLoadAnnotationsFromSearch = function(data) {
        if (data == null) {
            data = {};
        }
        return this._onLoadAnnotations(data.rows || []);
    };

    Store.prototype.loadAnnotationsFromLocal = function(data) {
      return this._onLoadAnnotations(data);
    };

    Store.prototype.dumpAnnotations = function() {
        var ann, _i, _len, _ref, _results;
        _ref = this.annotations;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            ann = _ref[_i];
            _results.push(JSON.parse(this._dataFor(ann)));
        }
        return _results;
    };

    Store.prototype._apiRequest = function(action, obj, onSuccess) {
        var id, options, request, url;
        id = obj && obj.id;
        url = this._urlFor(action, id);
        options = this._apiRequestOptions(action, obj, onSuccess);
        request = $.ajax(url, options);
        request._id = id;
        request._action = action;
        return request;
    };

    Store.prototype._apiRequestOptions = function(action, obj, onSuccess) {
        var data, method, opts;
        method = this._methodFor(action);
        opts = {
            type: method,
            headers: this.element.data('annotator:headers'),
            dataType: "json",
            success: onSuccess || function() {},
            error: this._onError
        };
        if (this.options.emulateHTTP && (method === 'PUT' || method === 'DELETE')) {
            opts.headers = $.extend(opts.headers, {
                'X-HTTP-Method-Override': method
            });
            opts.type = 'POST';
        }
        if (action === "search" || action === "read") {
            opts = $.extend(opts, {
                data: obj
            });
            return opts;
        }
        data = obj && this._dataFor(obj);
        if (this.options.emulateJSON) {
            opts.data = {
                json: data
            };
            if (this.options.emulateHTTP) {
                opts.data._method = method;
            }
            return opts;
        }
        opts = $.extend(opts, {
            data: data,
            contentType: "application/json; charset=utf-8"
        });
        return opts;
    };

    Store.prototype._urlFor = function(action, id) {
        var url;
        url = this.options.prefix != null ? this.options.prefix : '';
        url += this.options.urls[action];
        url = url.replace(/\/:id/, id != null ? '/' + id : '');
        url = url.replace(/:id/, id != null ? id : '');
        return url;
    };

    Store.prototype._methodFor = function(action) {
        var table;
        table = {
            'create': 'POST',
            'createAll': 'POST',
            'read': 'GET',
            'update': 'PUT',
            'updateAll': 'PUT',
            'destroy': 'DELETE',
            'destroyAll': 'DELETE',
            'search': 'GET'
        };
        return table[action];
    };

    Store.prototype._dataFor = function(annotation) {
        var data = '', highlights;
        if (annotation.constructor === Object) {
            highlights = annotation.highlights;
            delete annotation.highlights;
            $.extend(annotation, this.options.annotationData);
            data = JSON.stringify(annotation);
            if (highlights) {
                annotation.highlights = highlights;
            }
        } else if (annotation.constructor === Array) {
            highlights = [];
            for (var i = 0, len = annotation.length; i < len; i++) {
                highlights.push(annotation[i].highlights);
                delete annotation[i].highlights;
            }
            var d = $.extend({annotations: annotation}, this.options.annotationData);
            data = JSON.stringify(d);
            if (highlights) {
                for (var i = 0, len = annotation.length; i < len; i++) {
                    annotation[i].highlights = highlights[i];
                }
            }
        }
        return data;
    };

    Store.prototype._onError = function(xhr) {
        var action, message;
        action = xhr._action;
        message = Annotator._t("Sorry we could not ") + action + Annotator._t(" this annotation");
        if (xhr._action === 'search') {
            message = Annotator._t("Sorry we could not search the store for annotations");
        } else if (xhr._action === 'read' && !xhr._id) {
            message = Annotator._t("Sorry we could not ") + action + Annotator._t(" the annotations from the store");
        }
        switch (xhr.status) {
            case 401:
                message = Annotator._t("Sorry you are not allowed to ") + action + Annotator._t(" this annotation");
                break;
            case 404:
                message = Annotator._t("Sorry we could not connect to the annotations store");
                break;
            case 500:
                message = Annotator._t("Sorry something went wrong with the annotation store");
        }
        // Annotator.showNotification(message, Annotator.Notification.ERROR);
        wb.utility.notify(message, 'error');
        return console.error(Annotator._t("API request failed:") + (" '" + xhr.status + "'"));
    };

    return Store;

})(Annotator.Plugin);

/*
 //@ sourceMappingURL=store.map
 */
