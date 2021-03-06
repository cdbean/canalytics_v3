// store: manager of all data
//
//
if (!wb) wb = {};

wb.store = {
  // all items are stored here
  items: {
    datasets: {},
    dataentries:{},
    entities: {},
    relationships: {},
    annotations: {},
  },

  // only items on shelf are displayed in views
  shelf: {
    datasets: [],
    dataentries: [],
    entities: [],
    relationships: [],
    annotations: [],
  },

  // criteria for items on shelf
  shelf_by: {
    datasets: [],
    dataentries: [],
    entities: [],
    relationships: [],
    annotations: [],
  },

  // static properties
  // TODO: load these properties from server
  static: {
    dataentry: ['file', 'content', 'date'],
    event: ['start_date', 'end_date', 'repeated', 'repeated_until', 'person', 'location', 'organization', 'note'],
    location: ['address', 'note'],
    person: ['gender', 'age', 'job', 'note'],
    organization: ['person', 'category', 'note'],
    resource: ['category', 'note'],
    relationship: ['source', 'target', 'relation', 'note'],
    meta: ['created_by', 'created_at', 'last_edited_by', 'last_edited_at'],
    entity_types: ['person', 'location', 'organization', 'event', 'resource'],
  },

  // @url: string, url to load data
  // @options: object, should include group and case
  loadItems: function(url, options) {
    var _this = this;
    $.get(url, options, function(data) {
      for (var d in data) {
        var items = data[d];
        items.forEach(function(item) {
          if (d === 'entities') {
            if (item.primary.date) item.primary.date = wb.utility.Date(item.primary.date);
            if (item.primary.geometry) item.primary.geometry = wb.utility.formatGeometry(item);
          }
          _this.items[d][item.id || item.meta.id] = item;
        });
      }
      _this.setShelf();
      $.publish('data/loaded');
    });
  },

  updateItems: function(items) {
    var _this = this;

    for (var type in items) {
      var item = items[type];
      // item could be undefined
      if (!item) continue;
      if (item.constructor !== Array) item = [item];

      item.forEach(function(d) {
        if (!d) return;
        if (d.primary) {
          if (d.primary.date) d.primary.date = wb.utility.Date(d.primary.date);
          if (d.primary.geometry) d.primary.geometry = wb.utility.formatGeometry(d);
        }
        var id = d.id || d.meta.id;
        _this.items[type][id] = d;

        var shelf = _this.shelf[type];
        var i = shelf.indexOf(id);
        if (i < 0) {
          shelf.push(id);
        }
      });
    }
    if (!$.isEmptyObject(wb.filter.filter)) {
      this.cleanShelf();
    }
  },

  // put items on shelf
  setShelf: function() {
    // first put all items onto shelves
    this.resetShelf();
    // then clean off items not met with shelf_by criteria
    this.cleanShelf();
  },

  // put all items on their shelf
  resetShelf: function() {
    for (var s in this.shelf) {
      this.shelf[s] = [];
      for (var id in this.items[s]) {
        this.shelf[s].push(parseInt(id));
      }
    }
  },

  // get items off the shelf if they do not meet shelf_by criteria
  // @shelf: string, the shelf to be cleaned. If not provided, clean all
  // shelves
  cleanShelf: function(shelf) {
    for (var d in this.shelf_by) {
      if (this.shelf_by[d].length) {
        this['cleanShelfBy' + wb.utility.capfirst(d)](shelf);
      }
    }
  },

  cleanShelfByDatasets: function(shelf) {
    var selected_dataentries = [];
    var _this = this;

    if (['annotations', 'entities', 'relationships'].indexOf(shelf) > -1) return;

    this.shelf.datasets = this.shelf.datasets.filter(function(d) {
      return _this.shelf_by.datasets.indexOf(d) > -1;
    });

    if (shelf === 'datasets') return;

    this.shelf.datasets.forEach(function(d) {
      var ds = _this.items.datasets[d];
      if (!ds) return;
      selected_dataentries = selected_dataentries.concat(ds.dataentries);
    });
    this.shelf.dataentries = this.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });
  },

  cleanShelfByDataentries: function(shelf) {
    var selected_annotations = [];
    var selected_relationships = [];
    var selected_entities = [];
    var _this = this;

    this.shelf.dataentries = this.shelf.dataentries.filter(function(d) {
      return _this.shelf_by.dataentries.indexOf(d) > -1;
    });
    if (shelf === 'dataentries') return;

    this.shelf.dataentries.forEach(function(d) {
      var de = _this.items.dataentries[d];
      if (!de) return;
      selected_annotations = selected_annotations.concat(de.annotations);
    });
    this.shelf.annotations = this.shelf.annotations.filter(function(d) {
      return selected_annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    this.shelf.annotations.forEach(function(d) {
      var ann = _this.items.annotations[d];
      // if (!ann || ann.meta.deleted) return;
      selected_entities.push(ann.entity.id);
    });
    this.shelf.entities = this.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    this.shelf.entities.forEach(function(d) {
      var ent = _this.items.entities[d];
      // if (!ent || ent.meta.deleted) return;
      selected_relationships = selected_relationships.concat(ent.meta.relationships);
    })
    this.shelf.relationships = this.shelf.relationships.filter(function(d) {
      return selected_relationships.indexOf(d) > -1;
    });

  },

  cleanShelfByAnnotations: function(shelf) {
    var selected_dataentries = [];
    var selected_entities = [];
    var selected_relationships = [];
    var _this = this;

    this.shelf.annotations = this.shelf.annotations.filter(function(d) {
      return _this.shelf_by.annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    this.shelf.annotations.forEach(function(d) {
      var ann = _this.items.annotations[d];
      // if (!ann || ann.meta.deleted) return;
      selected_dataentries.push(ann.anchor);
      selected_entities.push(ann.entity && ann.entity.id);
      selected_relationships.push(ann.relationship && ann.relationship.id);
    });
    this.shelf.dataentries = this.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });
    if (shelf === 'dataentries') return;

    this.shelf.entities = this.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    this.shelf.relationships = this.shelf.relationships.filter(function(d) {
      return selected_relationships.indexOf(d) > -1;
    });

  },

  cleanShelfByEntities: function(shelf) {
    var selected_relationships = [];
    var selected_annotations = [];
    var selected_entities = this.shelf_by.entities.slice();
    var selected_dataentries = [];
    var _this = this;

    this.shelf_by.entities.forEach(function(ent_id) {
      var ent = _this.items.entities[ent_id];
      // if (!ent || ent.meta.deleted) return;
      selected_annotations = selected_annotations.concat(ent.meta.annotations);
      // get directly related relationships
      selected_relationships = selected_relationships.concat(ent.meta.relationships);
    });
    selected_relationships.forEach(function(rel) {
      // get directly related entities
      var r = _this.items.relationships[rel];
      // if (!r || r.meta.deleted) return;
      selected_entities.push(r.primary.source);
      selected_entities.push(r.primary.target);
    });
    selected_entities = wb.utility.uniqueArray(selected_entities);
    selected_entities.forEach(function(ent) {
      var e = _this.items.entities[ent];
      // if (!e || e.meta.deleted) return;
      e.meta.relationships.forEach(function(rel) {
        var r = _this.items.relationships[rel];
        // if (!r || r.meta.deleted) return;
        if (r.primary.relation === 'involve' && r.primary.source === ent) {
          // e.g. if the entity is an event, and 'involves' another person, the person should be filtered as 'related'
          selected_entities.push(r.primary.target);
          selected_relationships.push(rel);
        }
      });
    });
    selected_entities = wb.utility.uniqueArray(selected_entities);
    selected_relationships = wb.utility.uniqueArray(selected_relationships);

    this.shelf.relationships = this.shelf.relationships.filter(function(d) {
      return selected_relationships.indexOf(d) > -1;
    });
    if (shelf === 'relationships') return;

    this.shelf.annotations = this.shelf.annotations.filter(function(d) {
      return selected_annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    this.shelf.entities = this.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    this.shelf.annotations.forEach(function(d) {
      var ann = _this.items.annotations[d];
      // if (!ann || ann.meta.deleted) return;
      selected_dataentries.push(ann.anchor);
    });
    this.shelf.dataentries = this.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });

  },

  cleanShelfByRelationships: function(shelf) {
    var selected_entities = [];
    var selected_annotations = [];
    var selected_dataentries = [];
    var _this = this;

    this.shelf.relationships = this.shelf.relationships.filter(function(d) {
      return _this.shelf_by.relationships.indexOf(d) > -1;
    });
    if (shelf === 'relationships') return;

    this.shelf.relationships.forEach(function(d) {
      var r = _this.items.relationships[d];
      // if (!r || r.meta.deleted) return;
      selected_entities.push(r.primary.source);
      selected_entities.push(r.primary.target);
      selected_annotations = selected_annotations.concat(r.meta.annotations);
    });
    this.shelf.entities = this.shelf.entities.filter(function(d) {
      return selected_entities.indexOf(d) > -1;
    });
    if (shelf === 'entities') return;

    this.shelf.annotations = this.shelf.annotations.filter(function(d) {
      return selected_annotations.indexOf(d) > -1;
    });
    if (shelf === 'annotations') return;

    this.shelf.annotations.forEach(function(d) {
      var ann = _this.items.annotations[d];
      // if (!ann || ann.meta.deleted) return;
      selected_dataentries.push(ann.anchor);
    });
    this.shelf.dataentries = this.shelf.dataentries.filter(function(d) {
      return selected_dataentries.indexOf(d) > -1;
    });
  }
};
