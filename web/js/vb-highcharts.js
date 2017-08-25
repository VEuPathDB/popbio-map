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
        var abundanceUrl = "/popbio/map/asolr/solr/vb_popbio/query?";

	//Quick way of taking into consideration search terms in the serarch box
	if (qryUrl == "q=*:*") {
            var query = "q=has_abundance_data_b:true%20AND%20-sample_size_i:0%20AND%20projects_category:" + project_id;
	} else {
	    var query = qryUrl + "%20AND%20has_abundance_data_b:true%20AND%20-sample_size_i:0%20AND%20projects_category:" + project_id;
	}

        var json_facet = '&json.facet={species:{type:terms,limit:-1,field:species_category,facet:{collection_dates:{type:terms,limit:-1,sort:index,field:collection_date,facet:{sumAbnd:"sum(div(sample_size_i,collection_duration_days_i))"}}}}}';
        var queryParameters = query + "&rows=1&wt=json&fl=project_titles_txt";
        //Get filter of the record
        var filter = PopulationBiologyMap.data.filter + "&fq=bundle:pop_sample";
        var queryUrl = abundanceUrl + queryParameters + json_facet + filter; 

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
                        PopulationBiologyMap.data.single_species_data.data.push([unix_date, collection.sumAbnd]); 
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
        var abundanceUrl = "/popbio/map/asolr/solr/vb_popbio/query?";

        //Quick way of taking into consideration search terms in the serarch box
        if (qryUrl == "q=*:*") {
            var query = "q=has_abundance_data_b:true%20AND%20-sample_size_i:0";
        } else {
            var query = qryUrl + "%20AND%20has_abundance_data_b:true%20AND%20-sample_size_i:0";
        }

        var queryParameters = "&rows=0&wt=json&facet=true&facet.mincount=1&facet.field=projects_category&fq=bundle:pop_sample";
        var queryUrl = abundanceUrl + query + queryParameters + filter; // + "&json.wrf=?&callback=?";

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

                        projects_list.forEach(function (project) {
                            if (typeof project == 'string') {
                                //console.log(project);
                                $('<option/>', {
                                    text: project,
                                    value: project,
                                }).appendTo(aps);
                                label.appendTo($(divid));
                                aps.appendTo($(divid));
                            }
                        });

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
            legend: {
                enabled: true
            },
            title: {
                useHTML: true,
                text: title
            },
            chart: {
                height: "120%"
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
