(function (PopulationBiologyMap, $, undefined) {

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    PopulationBiologyMap.data.highcharts = {};
    
    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    PopulationBiologyMap.methods.createAbundanceGraph = function(divid, filter) {
        $('#swarm-plots h3').text('Population Abundance');
        //How the URL will be constructed
        var abundanceUrl = solrPopbioUrl + viewMode + "Projects?";
        var queryUrl = abundanceUrl + qryUrl + filter;

        PopulationBiologyMap.data.filter = filter;

        //Will need to find a better way of organizing these ajax calls
        //$('#swarm-chart-area').fadeOut();
        $.ajax({
            type: 'GET',
            url: queryUrl,
            dataType: 'json',
            success: function (json) {
                PopulationBiologyMap.data.projects_list = json.facet_counts.facet_fields.projects_category;
                PopulationBiologyMap.data.result_count = json.response.numFound;
            },
            error: function() {
                PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            }
        })
        .then(function () {
            // add GA - VB-4680
            Highcharts.setOptions({
                exporting: {
                  buttons: {
                    contextButton: {
                      text: '',
                      menuItems: [{
                        text: 'Print chart',
                        onclick: function() {
                          gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance Print'});
                          this.print();
                        }
                      }, {
                        separator: true,
                      }, {
                        text: 'Download PNG image',
                        onclick: function() {
                          gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance PNG'});                          
                          this.exportChart();
                        }
                      }, {
                        text: 'Download JPEG image',
                        onclick: function() {
                          gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance JPEG'});                          
                          this.exportChart({
                            type: 'image/jpeg'
                          });
                        }
                      }, {
                        text: 'Download PDF document',
                        onclick: function() {
                          gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance PDF'});
                          this.exportChart({
                            type: 'application/pdf'
                          });
                        }
                      }, {
                        text: 'Download SVG vector image',
                        onclick: function() {
                          gtag('event', 'exportchart', {'event_category': 'Popbio', 'event_label': 'Abundance SVG'});                          
                          this.exportChart({
                            type: 'image/svg+xml'
                          });
                        },
                        separator: false
                      }]
                    }
                  }
                }
            });    

            //Get graph data for project and build chart                
            //PopulationBiologyMap.data.selected_project = project_id;
            PopulationBiologyMap.data.highcharts = [];
            //Construct URL used to retrieve data from solr
            var abundanceUrl = solrPopbioUrl + viewMode + "Graphdata?";
            //var project = "&project=projects_category:" + project_id;
            // unfortunately 'term' seems to be a misnomer.  'field' would be better!
            var facet_term = "&term=" + mapSummarizeByToField(glbSummarizeBy).summarize;
            var queryUrl = abundanceUrl + qryUrl + facet_term + filter;
            var result_limit = 50000;

            if (PopulationBiologyMap.data.result_count > result_limit) {
                $("#swarm-chart-area").html(
                    '<div style="text-align: center; margin-top: 30px">' +
                    '<i class="fa fa-area-chart" style="color: #C3312D; font-size: 12em"></i>' +
                    '<h4>Too many points to plot</h4>' +
                    '<h4>Apply filters to plot less data</h4>' +
                    '<h4><b>Points</b>: ' + PopulationBiologyMap.data.result_count.toString() + '</h4>' +
                    '<h4><b>Limit</b>: ' + result_limit.toString() + '</h4>' +
                    '</div>'
                );
            } else {
                //This variable does not get populated fast enough so need to get it before creating the grap
                //Seems like I will need to go to the past codebaseh
                projects_list = PopulationBiologyMap.data.projects_list;
                if (projects_list  && Object.keys(projects_list).length > 1) {
                    $("#projects-notice").show();
                    PopulationBiologyMap.data.project_title = undefined;
                } else {
                    $("#projects-notice").hide();
                    PopulationBiologyMap.data.project_title = '';
                    PopulationBiologyMap.data.project_id = Object.keys(projects_list)[0];
                }
                
                $.ajax({
                    beforeSend: function(xhr) {
                        //Clear chart area and start the spinner
                        PaneSpin('swarm-plots', 'start');
                        $('#swarm-chart-area').empty();
                        $(divid + ' select').remove();
                        $(divid + ' label').remove();

                        //Probably not nessary
                        if (xhr && xhr.overrideMimeType) {
                            xhr.overrideMimeType('application/json;charset-utf-8');
                        }
                    },
                    url: queryUrl,
                    dataType: 'json',
                    success: function(json) {
                        //Get species (or protocols etc) collection info from response
                        var term_collections_list = json.facets.term.buckets;

                        if (PopulationBiologyMap.data.project_title != undefined) {
                            PopulationBiologyMap.data.project_title = json.response.docs[0].project_titles_txt;
                        } else {
                            PopulationBiologyMap.data.project_title = '';
                        }

                        term_collections_list.forEach(function (term_collections) {
                            //console.log(term_collections); 
                            //Used to hold the formatted data for a single species (or protocol, etc)  chart
                            var marker_color = legend.options.palette[term_collections.val];
                            var single_term_data = {
                                "name": term_collections.val, 
                                "marker": {
                                    "symbol": "circle"
                                },
                                "color": marker_color,
                                "data": []
                            };

                            collections_info = term_collections.collection_dates.buckets;
                            collections_info.forEach(function (collections_date) {
                                var unix_date = new Date(collections_date.val).getTime();;
                                var collections = collections_date.collection.buckets;
                                //if (collection.count > 1) {
                                //    console.log("In collection");
                                //    console.log(collection.count);
                                //}
                                collections.forEach(function (collection_abnd) {
                                    /*if (sample_size.count > 1) {
                                        console.log("In sample size");
                                        console.log(sample_size.count);
                                    }*/
                                    single_term_data.data.push([unix_date, collection_abnd.abnd]);
                                });
                                //console.log(collection);
                            });
                            PopulationBiologyMap.data.highcharts.push(single_term_data);
                        });
                    },
                    error: function() {
                        PaneSpin('swarm-plots', 'stop');
                        console.log("An error has occurred");
                    },
                    complete: function() {
                        //Construct graph with ajax call to Solr servr
                        var data = PopulationBiologyMap.data.highcharts;
                        var project_title = PopulationBiologyMap.data.project_title;
                        var project_id = PopulationBiologyMap.data.project_id;
                        var title = "<a href=/popbio/project?id=" + project_id + ">" + project_title + "</a>";
                        PopulationBiologyMap.methods.createStockchart(data, title); 
                        //Add tooltip to the title of the chart
                        $(".highcharts-title").tooltip({placement: "bottom", title:project_title});
                        PaneSpin('swarm-plots', 'stop');
                        //$('#swarm-chart-area').show()
                    }
                });
            }
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.init = function() {
        //Change event should no longer be needed since removing project select
        /*$("#swarm-plots").on("change", "#agSelectProject", function() {
            var project_id = $("#agSelectProject").val();
            createAbundanceGraph(project_id);
        });*/
    }


    PopulationBiologyMap.methods.createStockchart = function(data, title) {
        $('#swarm-chart-area').highcharts('StockChart',{
/*            xAxis: {
                labels: {
                    formatter: function () {
                        return this.value;
                    }
                }
            },
            rangeSelector: {
                enabled: false
            },*/
	    rangeSelector: {
                enabled: false
	    },
            legend: {
                enabled: true,
                labelFormat: "<i>{name}</i>"
            },
            title: {
                useHTML: true,
                text: title
            },
            chart: {
                type: 'scatter',
                //zoomType: 'xy',
                height: "200%"
            },
	    /*navigator: {
                enabled: false
	    },*/
            navigator: {
                /*xAxis: {
                    labels: {
                        formatter: function () {
                            return this.value;
                        }
                    }
                },*/
                series: {
                    data: []
                },
                height: 20
            },
            tooltip: {
                formatter: function () {
                    return  '<b>' + this.series.name +'</b><br/>' +
                        '<b>Date:</b> ' + Highcharts.dateFormat('%b %e, %Y',new Date(this.x)) + '<br>' + 
                        '<b>Collected:</b> ' + this.y;
                }
            },
	        /*series: [{
		    type: 'column',
		    name: 'USD to EUR',
		    data: [[1990,10]]
	        }]*/
            series: data
        });
    };

    $(document).ready(function () {
        PopulationBiologyMap.init();
    });
})(window.PopulationBiologyMap = window.PopulationBiologyMap || {}, jQuery);
