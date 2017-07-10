### Repository structure

``` shell
│
│   # Documentation for development and deployment
├── docs
│
│   # SOLR configuration files
├── SOLR
│   │   # SOLR configuration files for the main core of PopBio map
│   ├── vb_popbio
│   │   └── conf
│   │   # SOLR configuration files for the auto-complete core
│   ├── vb_ta
│   │   └── conf
│   │   # SOLR configuration files for the main core of expression Genea
│   └── genea_expression
│       └── conf
│
│   # Documentation for development and deployment
└── web
    ├── css
    │   # minified CSS and Javascript code for deployment
    ├── dist
    │   ├── css
    │   └── js
    ├── images
    ├── js
    │   └── genea
    │   # third party libraries. Each of these is a forked repo
    ├── libs
    │   ├── beeswarm
    │   ├── bootstrap-select
    │   ├── bootstrap-slider
    │   ├── bootstrap-tagsinput
    │   ├── bootstrap-toggle
    │   ├── genea #libs needed for genea
    │   ├── geohash-js
    │   ├── jquery-infinite-scroll-helper
    │   ├── jsrender
    │   ├── Leaflet.EasyButton
    │   ├── leaflet.fullscreen
    │   ├── Leaflet.Spin
    │   ├── Leaflet.vector-markers
    │   ├── leaflet-dvf
    │   ├── leaflet-zoom-min
    │   ├── node-geohash
    │   ├── nvd3
    │   ├── PruneCluster
    │   ├── sidebar-v2
    │   ├── spin.js
    │   └── typeahead.js
    └── tiles  # folder containing generated map tiles for genea
```


### Adding a new view

### Displaying dynamic text data using templates

Apart from the search autocomplete, there are 2 other locations where we display AJAX-driven
text data in the map:
* The table view
* The point tooltips for the beeswarm plots
* The project info tooltip in the table view

Tooltips and tables are generated dynamically using [JsRender](https://www.jsviews.com/)
templates. These templates are defined in the
[main html document](../web/vb_geohashes_mean.html) as follows

``` html
<script type="text/x-jsrender" id="projectInfoTemplate">
    <div class="row no-pad" style="width: 370px;">
        <div class="row less-margin">
            <div class="col-md-6">
                <p style="color: {{attr:bgColor}};">
                    <i class="fa fa-fw fa-calendar " title="In VectorBase since"></i><b> In VectorBase since</b>
                </p>
                <ul><li>
                {{attr:creation_date}}
                </li></ul>
            </div>
        </div>
    </div>
</script>
```

which is a mix of HTML with dynamic text linked to parameters in double curly brackets.

Then you can populate the HTML element of choice (e.g. tooltip)

``` javascript
// select the DOM element to be updated
var entityTooltip = $('#vbEntityTooltip');

// select the JsRender template
var template = $.templates("#projectInfoTemplate");

// define the REST API URL
var entityRestURL = '/popbio/REST/project/' + id + '/head';

// setup an ajax promise
var entityPromise = $.getJSON(entityRestURL);

entityPromise.done(function (entityJson) {

    // render the template
    var tooltipHtml = template.render(entityJson);
    // and use the resulting HTML to populate the DOM element
    entityTooltip.html(tooltipHtml);
    
    

})
.fail(function () {
    // Do something
})
;
```


