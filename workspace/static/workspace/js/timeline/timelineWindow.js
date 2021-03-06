$.widget('viz.viztimeline', $.viz.vizbase, {
    options: {
    },
    _create: function() {
      this.options.base.resizeStop = this.resize.bind(this);
      this.options.extend.maximize = this.resize.bind(this);
      this.options.extend.restore  = this.resize.bind(this);
      this.options.extend.help = this.help;
      this.element.addClass('timeline');
      this._super('_create');

      this.updateSize();
      this.setupUI();

      this.detailTimeline = wb.viz.timeline()
        .width(this.detailTimelineWidth)
        .height(this.height)
        .trackBy('person')
        .on('zoom', this.onDetailZoom.bind(this))
        .on('zoomstart', this.onDetailZoomStart.bind(this))
        .on('elaborate', this.onDetailElaborate.bind(this))
        .on('delaborate', this.onDetailDelaborate.bind(this))
        .on('filter', this.onDetailFilter.bind(this));

      this.overviewTimeline = wb.viz.timeline()
        .width(this.overviewTimelineWidth)
        .height(this.height)
        .trackBy('person')
        .itemWidth(10)
        .itemMinHeight(5)
        .itemPadding(2)
        .showLabel(false) // do not show labels
        .brushable(true)
        .on('filter', this.onOverviewFilter.bind(this));

      this.updateData();
      this.updateView();

      // show brush in overviewTimeline
      this.overviewTimeline.setBrush(this.overviewTimeline.domain());

      return this;
    },

    updateSize() {
      this.width = this.element.innerWidth() - 20,
      this.height = this.element.innerHeight() - 20;
      this.overviewTimelineWidthRatio = .25;
      this.detailTimelineWidthRatio = .75;
      this.overviewTimelineWidth = this.width * this.overviewTimelineWidthRatio;
      this.detailTimelineWidth = this.width * this.detailTimelineWidthRatio;
    },

    _destroy: function() {
      this._super('_destroy');
    },

    onDetailDelaborate: function(d) {
      wb.viewer.hide();
    },

    onDetailElaborate: function(d, pos) {
      var entity = wb.store.items.entities[d.id];
      wb.viewer.data(entity, 'entity').show(pos, 'timeline');
      wb.log.log({
        operation: 'read',
        item: 'entity',
        tool: 'timeline',
        data: wb.log.logItem(entity),
        public: false
      })
    },

    onDetailZoomStart: function(domain) {
      wb.log.log({
        operation: 'reconfig',
        item: 'timeline',
        tool: 'timeline',
        public: false
      })
    },
    onDetailZoom: function(domain) {
      this.overviewTimeline.setBrush(domain);
    },

    onDetailFilter: function(filter, extent) {
      var filter_id = filter.map(function(d) { return d.id; })

      if (!filter.length) {
        wb.filter.remove('timeline');
      } else {
        wb.filter.set(filter_id, 'timeline', extent);
      }
    },

    onOverviewFilter: function(filter, timeDomain) {
      var domain = timeDomain || this.overviewTimeline.domain();
      d3.select(this.element[0])
        .select('svg#detailTimeline')
        .call(this.detailTimeline.domain(domain));
    },

    updateView: function() {
      var data = [];
      wb.store.shelf.entities.forEach(function(d) {
        var entity = wb.store.items.entities[d];
        if (entity.meta.deleted) return;
        if (entity.primary.entity_type === 'event') {
          if (entity.primary.start_date) {
            if (entity.primary.repeated) {
              if (entity.primary.repeated.constructor !== Array) {
                // for backward compatibility, if repeated is boolean
                var repeat_delta = 1000 * 3600 * 24 * 7; // hard code: repeat every week
                var repeated_until = wb.utility.Date(entity.primary.repeated_until) || wb.info.case.end_date;
                var start_date = wb.utility.Date(entity.primary.start_date);
                var end_date = wb.utility.Date(entity.primary.end_date);
                var delta = end_date - start_date;
                var date = start_date;
                var index = 0;
                while (date <= repeated_until) {
                  data.push({
                    start: date,
                    end: new Date(date.getTime() + delta),
                    label: entity.primary.name,
                    lid: entity.meta.id + '-' + index, // local id, for viz only
                    id: entity.meta.id
                  });
                  date = new Date(date.getTime() + repeat_delta);
                  index ++;
                }
              } else {
                // repeated is array of days in week
                var repeat_delta = 1000 * 3600 * 24; // one day
                var repeated_until = wb.utility.Date(entity.primary.repeated_until) || wb.info.case.end_date;
                var start_date = wb.utility.Date(entity.primary.start_date);
                var end_date = wb.utility.Date(entity.primary.end_date);
                var delta = end_date - start_date;
                var date = start_date;
                var index = 0;
                while (date <= repeated_until) {
                  if (entity.primary.repeated.indexOf(date.getDay()) > -1) {
                    data.push({
                      start: date,
                      end: new Date(date.getTime() + delta),
                      label: entity.primary.name,
                      lid: entity.meta.id + '-' + index, // local id, for viz only
                      id: entity.meta.id
                    });
                    index ++;
                  }
                  date = new Date(date.getTime() + repeat_delta);
                }
              }
            } else {
              data.push({
                start: wb.utility.Date(entity.primary.start_date),
                end: wb.utility.Date(entity.primary.end_date),
                label: entity.primary.name,
                id: entity.meta.id,
                lid: entity.meta.id
              });
            }
          }
        }
      });

      if (data.length) {
        this.element.find('.placeholder').hide();
        this.element.find('.main').show();

        d3.select(this.element[0])
          .select('svg#detailTimeline')
          .datum(data)
          .call(this.detailTimeline);

        d3.select(this.element[0])
          .select('svg#overviewTimeline')
          .datum(data)
          .call(this.overviewTimeline)
      } else {
        this.element.find('.placeholder').show();
        this.element.find('.main').hide();
      }

      this.data = data;

      return this;
    },

    // cancel filter
    defilter: function() {
      this.detailTimeline.defilter();
    },

    // get the detailTimeline time range
    getState: function() {
      return this.detailTimeline.domain();
    },

    setState: function(state) {
      var state = state.map(function(d) { return wb.utility.Date(d); });
      this.overviewTimeline.setBrush(state);
      this.detailTimeline.domain(state);
      d3.select(this.element[0])
        .select('svg#detailTimeline')
        .call(this.detailTimeline);
    },

    setFilter: function(extent) {
      // extent is time string
      this.element.find('#filterBtn').addClass('btn-primary');
      extent = extent.map(function(d) { return wb.utility.Date(d); });

      this.detailTimeline.brushable(true)
        .setBrush(extent);
    },

    updateData: function() {
      return this;
    },

    setupUI: function() {
      var html = ' \
        <div class="main"> \
          <ul class="controls" style="margin-top:10px;"> \
            <li class="control"> \
              <button id="filterBtn" class="btn btn-sm"> Filter </button> \
            </li> \
          </ul> \
          <div class="pull-left"> \
            <svg id="overviewTimeline"></svg> \
          </div> \
          <div class="pull-left"> \
            <svg id="detailTimeline"></svg> \
          </div> \
        </div> \
        <div class="jumbotron placeholder"> \
          <div class="container"> \
            <div class="text-center"> \
              <p>Add events to display here</p> \
            </div> \
          </div> \
        </div> \
      ';
      this.element.append(html);

      d3.select(this.element[0])
        .select('svg#detailTimeline')
        .attr('width', this.detailTimelineWidth)
        .attr('height', this.height);

      d3.select(this.element[0])
        .select('svg#overviewTimeline')
        .attr('width', this.overviewTimelineWidth)
        .attr('height', this.height);

      // register events
      var _this = this;

      this.element.find('.control button').click(function() {
        $(this).toggleClass('btn-primary');
        var infilter = $(this).hasClass('btn-primary');
        _this.detailTimeline.brushable(infilter);
        d3.select(_this.element[0])
          .select('svg#detailTimeline')
          .call(_this.detailTimeline)
        if (!infilter) {
          // if filter is deactivated, cancel the filter if any
          if ('timeline' in wb.filter.filter) {
            wb.filter.remove('timeline');
          }
        }
      });
    },

    resize: function() {
      this._super('resize');
      this.updateSize();

      this.detailTimeline.width(this.detailTimelineWidth).height(this.height);
      this.overviewTimeline.width(this.overviewTimelineWidth).height(this.height);

      if (this.data.length) {
        d3.select(this.element[0])
          .select('svg#detailTimeline')
          .attr('width', this.detailTimelineWidth)
          .attr('height', this.height)
          .call(this.detailTimeline);

        d3.select(this.element[0])
          .select('svg#overviewTimeline')
          .attr('width', this.overviewTimelineWidth)
          .attr('height', this.height)
          .call(this.overviewTimeline);
      }

      return this;
    },

    help: function() {
      var hint = new EnjoyHint({});
      hint.set(wb.help.timeline);
      hint.run();
      return this;
    }
});
