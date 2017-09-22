(function (PopulationBiologyMap, $, undefined) {

    if (PopulationBiologyMap.data == undefined) {
        PopulationBiologyMap.data = {};
    }

    PopulationBiologyMap.data.highcharts = {};
    
    if (PopulationBiologyMap.methods == undefined) {
        PopulationBiologyMap.methods = {};
    }

    function createAbundanceGraph(project_id) {
        //Get graph data for project and build chart                
        PopulationBiologyMap.data.selected_project = project_id;
        PopulationBiologyMap.data.highcharts[project_id] = [];

        //Construct URL used to retrieve data from solr
        var abundanceUrl = "/popbio/map/asolr/solr/vb_popbio/abndGraphdata?";
	var project = "&project=projects_category:" + project_id;
        //var json_facet = '&json.facet={species:{type:terms,limit:-1,field:species_category,facet:{collection_dates:{type:terms,limit:-1,sort:index,field:collection_date,facet:{sample_size:{type:terms, field:sample_size_i}}}}}}';
        
	//Get filter of the record
        var filter = PopulationBiologyMap.data.filter;
        var queryUrl = abundanceUrl + qryUrl + project + filter; 

        $.ajax({
            url: queryUrl,
            dataType: 'json',
            success: function(json) {
                //Get species collection info from response
                var species_collections_list = json.facets.species.buckets;
                PopulationBiologyMap.data.project_title = json.response.docs[0].project_titles_txt;

                species_collections_list.forEach(function (species_collections) {
                    //console.log(species_collections);

                    //Used to hold the formatted data for a single species chart
                    PopulationBiologyMap.data.single_species_data = {"name": species_collections.val, "data": []};
                    collections_info = species_collections.collection_dates.buckets;
                    collections_info.forEach(function (collection) {
                        var unix_date = new Date(collection.val).getTime();
                        sample_sizes = collection.sample_size.buckets;
                        if (collection.count > 1) {
                            console.log("In collection");
                            console.log(collection.count);
                        }
                        sample_sizes.forEach(function (sample_size) {
                            if (sample_size.count > 1) {
                                console.log("In sample size");
                                console.log(sample_size.count);
                            }
                            PopulationBiologyMap.data.single_species_data.data.push([unix_date, sample_size.val]);
                        });
                        //console.log(collection);
                    });
                    //Putting project_id in local variable to not type out original
                    var project_id = PopulationBiologyMap.data.selected_project;
                    PopulationBiologyMap.data.highcharts[project_id].push(PopulationBiologyMap.data.single_species_data);
                });
            },
            error: function() {
                 //PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            },
            complete: function() {
                //Construct graph with ajax call to Solr servr
                var data = PopulationBiologyMap.data.highcharts[project_id];
                var project_title = PopulationBiologyMap.data.project_title;
		var title = "<a href=/popbio/project?id=" + project_id + ">" + project_title + "</a>";
                PopulationBiologyMap.methods.createStockchart(data, title); 
		//Add tooltip to the title of the chart
		$(".highcharts-title").tooltip({placement: "bottom", title:project_title});
                PaneSpin('swarm-plots', 'stop');
                $('#swarm-chart-area').show()
            }
        });
    }

    //Tasks that need to be done or events defined  when the page loads
    PopulationBiologyMap.init = function() {
        $("#swarm-plots").on("change", "#agSelectProject", function() {
            var project_id = $("#agSelectProject").val();
            createAbundanceGraph(project_id);
        });
    }


    PopulationBiologyMap.methods.qs = function(key) {
        key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
        var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
        return match && decodeURIComponent(match[1].replace(/\+/g, " "));
    }

    PopulationBiologyMap.methods.createProjectSelect = function(divid, filter) {
	$('#swarm-plots h3').text('Population Abundance');
        //How the URL will be constructed
        //var abundanceUrl = solrPopbioUrl + 'abndProjects?&
        var abundanceUrl = "/popbio/map/asolr/solr/vb_popbio/abndProjects?";
        var queryUrl = abundanceUrl + qryUrl + filter;

        PopulationBiologyMap.data.filter = filter;

        $('#swarm-chart-area').fadeOut();

        //$.getJSON(url)
        //    .done(function (json) {
        $.ajax({
            type: 'GET',
            url: queryUrl,
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
            dataType: 'json',
            success: function (json) {
                //console.log(json);
                var projects_list = json.facet_counts.facet_fields.projects_category;
                if (projects_list && Object.keys(projects_list).length > 0) {
                    setTimeout(function () {
                        //Create the dropdown
                        var label = $('<label>').text('Select Project to View Abundance Graph: ');
                        var aps = $('<select />').attr('id', 'agSelectProject')
                            .attr('class', 'form-control');
                        for (var project in projects_list) {
                            if (typeof project == 'string') {
                                //console.log(project);
                                $('<option/>', {
                                    text: project,
                                    value: project,
                                }).appendTo(aps);
                                label.appendTo($(divid));
                                aps.appendTo($(divid));
                            }
                        }

                        //Build graph using the first option in the drop-down
                        //console.log("Adding graph");
                        var project_id = aps.find(':selected').val();
                        createAbundanceGraph(project_id);
                    }, delay);
                }
            },
            error: function() {
                //PaneSpin('swarm-plots', 'stop');
                console.log("An error has occurred");
            }
        });
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
                enabled: true
            },
            title: {
                useHTML: true,
                text: title
            },
            chart: {
		type: 'scatter',
	        zoomType: 'xy',
                height: "200%"
            },
	    navigator: {
                enabled: false
	    },
           /* navigator: {
                xAxis: {
                    labels: {
                        formatter: function () {
                            return this.value;
                        }
                    }
                },
                series: {
                    data: []
                },
                height: 20
            },*/
            /*tooltip: {
                formatter: function () {
                    var headerHTML = '<span style="font-size: 10px">Year '+ this.x;
                    var dataGrouped = false;
                    var footerHTML = '';

                    //Sort the tooltip points from largest value to lowest
                    var sortedPoints = this.points.sort(
                        function(a, b) {
                            return ((a.y > b.y) ? -1 : ((a.y < b.y) ? 1 : 0));
                        }
                    );


                    //$.each(this.points, function (i, point) {
                    $.each(sortedPoints, function (i, point) {
                        if (point.series.hasGroupedData) {
                            dataGrouped = true;
                        }
                        footerHTML += '<br/><span style="color: ' + point.series.color + '">' +
                            point.series.name + ':</span><b>' + point.y + '</b>';
                    });

                    if (dataGrouped) {
                        headerHTML += '  <i>(Grouped Data)</i></span><br/>'
                    } else {
                       headerHTML += '</span><br/>';
                    }

                    return headerHTML + footerHTML;
                }  
            },*/
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
