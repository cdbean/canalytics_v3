$.widget('viz.vizhistory', $.viz.vizbase, {
  options: {
    url: 'logs'
  },

  _create: function() {
    this._super('_create');

    this._setupUI();
    this.loadData();
  },

  _setupUI: function() {
    var html = '\
      <ul class="history-list"></ul> \
    ';
    this.element.append(html);

    // click on timestamp, jump to context
    this.element.on('click', 'li.history-item .timestamp', this.jumpToContext.bind(this));
  },

  loadData: function() {
    var _this = this;

    $.get(this.options.url, {
      'case': wb.info.case,
      group: wb.info.group
    }, function(data) {
      for (var i = 0, len = data.length; i < len; i++) {
        _this.add(data[i]);
      }
    });

  },

  add: function(item) {
    // item structure:
    // {'user': user_id, 'operation': '', 'time': '', 'data': ''}
    var row = $('<li class="history-item">').prependTo(this.element.find('ul.history-list'));
    var user = wb.info.users[item.user];
    $('<span class="timestamp">').appendTo(row)
      .text(item.time);
    $('<span class="username">').appendTo(row)
      .text(user.name)
      .css('color', user.color);

    var action = item.operation + ' ' + item.item;
    var entity;
    if (item.data) {
      if (item.data.name) {
        action += ' <a class="item">' + item.data.name + '</span>';
      }

    }
    $('<span class="content">').appendTo(row)
      .html(action)
    ;
    if (wb.store.ENTITY_ENUM.indexOf(item.item) > -1) {
      var entity = wb.store.entities[item.data.id];
      row.find('.item').addClass('entity').addClass(item.item).data('entity', entity);
    }

    if (item.user === wb.info.user) {
      row.css('background-color', '#eee')
    }

    row.data('context', item)
  },

  jumpToContext: function(e) {
    // highlight the selected action
    var row = $(e.target).parent();
    if (row.hasClass('active')) {
      row.removeClass('active');
      return;
    }
    row.parent().children('.history-item').removeClass('active');
    row.addClass('active');

    // open the tool in which the action is performed
    var data = row.data('context');
    if (data) {
      if (data.item) {
        // $('#' + data.tool + '-btn').click();
        var subtitle = ' - restored from '
          + data.time
          + ' by '
          + wb.info.users[data.user].name;
        viz_opt = data.item.split('_');
        var viz_name = viz_opt[0];
        var viz_form = viz_opt[1];
        var viz;
        if (viz_form === 'table') {
            if (viz_name === 'dataentry') {
                viz = $('<div>').vizdataentrytable({
                    title: 'Data Entry' + subtitle,
                });
            } else {
                viz = $('<div>').vizentitytable({
                    title: viz_name + subtitle,
                });
            }
        } else if (viz_name === 'timeline') {
            viz = $('<div>').viztimeline({
                title: 'Timeline' + subtitle,
            });
        } else if (viz_name === 'map' || viz_name === 'location') {
            viz = $('<div>').vizmap({
                title: 'Map' + subtitle,
            });
        } else if (viz_name === 'network' || viz_name === 'relationship') {
            viz = $('<div>').viznetwork({
                title: 'Network' + subtitle,
            });
        } else if (viz_name === 'notepad') {
            viz = $('<div>').viznotepad({
                title: 'Notepad' + subtitle
            });
        } else if (viz_name === 'message') {
          viz = $('<div>').vizmessage({
            title: 'Message' + subtitle
          });
        } else if (/annotation/.test(viz_name)) {
          viz = $('<div>').vizdataentrytable({
              title: 'Data Entry' + subtitle,
          });
        } else if (wb.store.ENTITY_ENUM.indexOf(viz_name) > -1) {
          viz = $('<div>').vizentitytable({
              title: viz_name + subtitle,
          });
        }

        if (viz) {
            viz.addClass('history');
            viz.parent().addClass('history');
            if (data.data && data.data.id) {
              viz.data('instance').highlight(data.data.id)
            }
            wb.vartifacts.push(viz);
        }

      }
    }

  },

  reload: function() {

  },

  update: function() {

  }
});