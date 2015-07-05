/**
 * Created by Ioannis on 18/6/2015.
 */
// Class: Violin --------------------------------------------- //
function addViolin(svg, results, yRange, width, yDomain, resolution, interpolation, log) {

    "use strict";

    var x, dx = ((yDomain[1] - yDomain[0]) / resolution) / 2;
    // for x axis
    var y = d3.scale.linear()
        .range([width / 2, 0])
        .domain([0, Math.max(d3.max(results, function (d) {
            return d.count * 1.5;
        }))]); //0 -  max probability


    if (log) {
        x = d3.scale.log()
            .range(yRange)
            .domain(yDomain)
            .nice();
        console.log('Printing log in violin');
    } else {
        // for y axis
        x = d3.scale.linear()
            .range(yRange)
            .domain(yDomain)
            .nice();
    }


    console.log("Now printing scaled violin area data");
    var area = d3.svg.area()
        .interpolate(interpolation)
        .x(function (d) {
            return x(d.val + dx)
        })
        .y0(width / 2)
        .y1(function (d) {
            return y(d.count);
        });

    var line = d3.svg.line()
        .interpolate(interpolation)
        .x(function (d) {
            return x(d.val + dx);
        })
        .y(function (d) {
            return y(d.count);
        });

    var gPlus = svg.append("g");
    var gMinus = svg.append("g");

    gPlus.append("path")
        .datum(results)
        .attr("class", "area")
        .attr("d", area);

    gPlus.append("path")
        .datum(results)
        .attr("class", "violin")
        .attr("d", line);


    gMinus.append("path")
        .datum(results)
        .attr("class", "area")
        .attr("d", area);

    gMinus.append("path")
        .datum(results)
        .attr("class", "violin")
        .attr("d", line);


    gPlus.attr("transform", "rotate(90,0,0)  translate(0,-" + width + ")");//translate(0,-200)");
    gMinus.attr("transform", "rotate(90,0,0) scale(1,-1)");


}

function addBoxPlot(svg, elmProbs, elmMean, yRange, width, yDomain, boxPlotWidth, log) {

    "use strict";

    if (log) {
        var y = d3.scale.log()
            .range(yRange)
            .domain(yDomain)
            .nice();
        console.log('Printing log in boxplot');

    } else {

        var y = d3.scale.linear()
            .range(yRange)
            .domain(yDomain)
            .nice();
    }

    var x = d3.scale.linear()
        .range([0, width]);

    var left = 0.5 - boxPlotWidth / 2;
    var right = 0.5 + boxPlotWidth / 2;

    var probs = [0.05, 0.25, 0.5, 0.75, 0.95];
    for (var i = 0; i < probs.length; i++) {
        probs[i] = y(elmProbs[i]);
    }

    var gBoxPlot = svg.append("g");


    gBoxPlot.append("rect")
        .attr("class", "boxplot fill")
        .attr("x", x(left))
        .attr("width", x(right) - x(left))
        .attr("y", probs[3])
        .attr("height", -probs[3] + probs[1]);

    var iS = [0, 2, 4];
    var iSclass = ["", "median", ""];
    for (var i = 0; i < iS.length; i++) {
        gBoxPlot.append("line")
            .attr("class", "boxplot " + iSclass[i])
            .attr("x1", x(left))
            .attr("x2", x(right))
            .attr("y1", probs[iS[i]])
            .attr("y2", probs[iS[i]])
    }

    iS = [[0, 1], [3, 4]];
    for (i = 0; i < iS.length; i++) {
        gBoxPlot.append("line")
            .attr("class", "boxplot")
            .attr("x1", x(0.5))
            .attr("x2", x(0.5))
            .attr("y1", probs[iS[i][0]])
            .attr("y2", probs[iS[i][1]]);
    }

    gBoxPlot.append("rect")
        .attr("class", "boxplot")
        .attr("x", x(left))
        .attr("width", x(right) - x(left))
        .attr("y", probs[3])
        .attr("height", -probs[3] + probs[1]);

    gBoxPlot.append("circle")
        .attr("class", "boxplot mean")
        .attr("cx", x(0.5))
        .attr("cy", y(elmMean))
        .attr("r", x(boxPlotWidth / 5));

    //gBoxPlot.append("circle")
    //    .attr("class", "boxplot mean")
    //    .attr("cx", x(0.5))
    //    .attr("cy", y(elmMean))
    //    .attr("r", x(boxPlotWidth / 10));


}

function addBeeswarm(svg, points, yRange, xRange, yDomain, xDomain, log) {

    "use strict";

    var y, tooltip = d3.select('#beeSwarmTooltip');

    if (log) {
        y = d3.scale.log()
            .range(yRange)
            .domain(yDomain)
            .nice();

    } else {

        y = d3.scale.linear()
            .range(yRange)
            .domain(yDomain)
            .nice();
    }

    var x = d3.scale.linear()
        .range(xRange)
        .domain(xDomain)
        .nice();


    var gSwarmPlot = svg.append("g");


    points.swarm.forEach(function (p, i) {

        var species = points.data[i].species, insecticide = points.data[i].insecticide;

        gSwarmPlot.append("circle")
            .attr("cx", x(p.x))
            .attr("cy", y(p.y))
            .attr("r", 4)
            .style("fill", palette[species])
            //ToDo: Make mouseovers stylistically similar with the donut charts
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                tooltip.html(species + "<br/> ("
                    + insecticide + ": " + points.data[i].y + ")")
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")

            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

    });


}

function createBeeViolinPlot(divid, BBox, count) {

    "use strict";

    // Only proceed if in IR mode
    if ($('#view-mode').val() === 'smpl') return;

    var self = this;
    var url = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolinStats?&' + qryUrl + BBox + '&json.wrf=?&callback=?';
    //var url = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolinStats?&' + qryUrl + BBox + '&json.wrf=?&callback=?';

    //console.log(BBox);
    //console.log(count);
    $(divid).empty();


    $.getJSON(url)
        .done(function (json) {
            // make sure the parent div is empty

            if (json.facets.count && json.facets.count > 0) {

                var bs = $('<select />').attr('id', 'bgPlotType');
                $('<option/>', {text: 'Phenotypes matching search', value: 1}).appendTo(bs);
                $('<option/>', {text: 'Phenotypes visible on map', value: 2}).appendTo(bs);
                $('<option/>', {text: 'All phenotypes', value: 3}).appendTo(bs);
                bs.appendTo($(divid));

                // let's create and populate a drop down
                var s = $('<select />').attr('id', 'plotType');

                // add options to the selection box, store additional info into data
                json.facets.vtypes.buckets.forEach(function (element) {
                        var i = 0;
                        element.vunits.buckets.forEach(function (innElement) {
                            var optionText = element.val + ' (' + innElement.val + '): ' + innElement.count + ' phenotypes';
                            $('<option/>', {
                                text: optionText,
                                value: innElement.val,
                                data: {
                                    phenotype_value_type_s: element.val,
                                    phenotype_value_unit_s: innElement.val,
                                    count: innElement.count,
                                    min: innElement.pmin,
                                    max: innElement.pmax
                                }
                            }).appendTo(s);
                        })
                    }
                )
                ;

                s.appendTo($(divid));

                // build the graph using the first option in the drop-down
                var selectionData = s.find(':selected').data();

                //buildBackgroundPlot(divid, BBox, selectionData);
                buildPlot(divid, BBox, selectionData);

                // build a new graph whenever selection is changed
                s.change(function () {
                    selectionData = s.find(':selected').data();
                    buildPlot(divid, BBox, selectionData);
                });
                bs.change(function () {
                    selectionData = s.find(':selected').data();
                    buildPlot(divid, BBox, selectionData);
                });


            }
        })
        .fail(function () {
            console.log('Failed while loading irViolinStats')
        });


}

function buildPlot(divid, BBox, selection) {
    "use strict";

    var pCount = selection.count, pMin = selection.min, pMax = selection.max,
        pType = selection.phenotype_value_type_s, pUnit = selection.phenotype_value_unit_s;
    var width = 380, height = 300;
    var plotDiv = d3.select(divid);
    var resolution = 25, interpolation = 'basis';
    var vlJsonFacet = {
        pmin: "min(phenotype_value_f)",
        pmax: "max(phenotype_value_f)"
    };

    var mapBounds = buildBbox(map.getBounds());

    if (d3.select('#beeViolinPlot')) d3.select('#beeViolinPlot').remove();
    var svg = plotDiv.append("svg")
        .attr("style", 'width: 380px; height: 500px; border: 0; padding-top:20px')
        .attr("id", "beeViolinPlot");

    var boxWidth = 150, boxSpacing = 10;
    var margin = {top: 30, bottom: 30, left: 30, right: 20};


    // Initialize background urls and promises
    var bgrBsUrl, bgrVlUrl;

    switch ($('#bgPlotType').val()) {
        // Phenotypes matching search terms
        case "1":
            bgrVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + qryUrl + '&fq=phenotype_value_type_s:"' + pType
                + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
            break;
        // Phenotypes visible on map
        case "2":
            bgrVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + qryUrl + mapBounds + '&fq=phenotype_value_type_s:"' + pType
                + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
            break;
        // All phenotypes
        case "3":
            bgrVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + 'q=*' + '&fq=phenotype_value_type_s:"' + pType
                + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
            break;
        default:
            break;
    }

    $.getJSON(bgrVlUrl)
        .done(function (bgrVlJson) {
            var bgrCount = bgrVlJson.response.numFound, bgrMin = bgrVlJson.facets.pmin, bgrMax = bgrVlJson.facets.pmax;
            if (pUnit === 'percent') {
                bgrMin = 0;
                bgrMax = 100;
            }
            vlJsonFacet = {
                pmean: "avg(phenotype_value_f)",
                pperc: "percentile(phenotype_value_f,5,25,50,75,95)",
                pmin: "min(phenotype_value_f)",
                pmax: "max(phenotype_value_f)",
                denplot: {
                    type: "range",
                    field: "phenotype_value_f",
                    gap: (bgrMax - bgrMin) / resolution,
                    start: bgrMin,
                    end: bgrMax
                }
            };
            // rebuild the urls now that we have the min and max values
            switch ($('#bgPlotType').val()) {
                // Phenotypes matching search terms
                case "1":
                    bgrBsUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irBeeswarm?&' + qryUrl + '&fq=phenotype_value_type_s:"' + pType
                        + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + '&json.wrf=?&callback=?';
                    bgrVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + qryUrl + '&fq=phenotype_value_type_s:"' + pType
                        + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
                    break;
                // Phenotypes visible on map
                case "2":
                    bgrBsUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irBeeswarm?&' + qryUrl + mapBounds + '&fq=phenotype_value_type_s:"' + pType
                        + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + '&json.wrf=?&callback=?';
                    bgrVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + qryUrl + mapBounds + '&fq=phenotype_value_type_s:"' + pType
                        + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
                    break;
                // All phenotypes
                case "3":
                    bgrBsUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irBeeswarm?&' + 'q=*' + '&fq=phenotype_value_type_s:"' + pType
                        + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + '&json.wrf=?&callback=?';
                    bgrVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + 'q=*' + '&fq=phenotype_value_type_s:"' + pType
                        + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
                    break;
                default:
                    break;
            }

            // build background plot
            var bgrVlPromise = $.getJSON(bgrVlUrl);
            bgrVlPromise.done(function (bgrVlJson) {

                var gb = svg.append("g").attr("transform", "translate(" + (0 * (boxWidth + boxSpacing) + margin.left) + ",0)");

                var bgrCount = bgrVlJson.response.numFound, bgrMin = bgrVlJson.facets.pmin, bgrMax = bgrVlJson.facets.pmax;
                if (pUnit === 'percent') {
                    bgrMin = 0;
                    bgrMax = 100;
                }


                var bgrYDomain = [bgrMin, bgrMax];

                var dataset, // store the points to be plotted
                    firstResult, beeswarm, xaxis = boxWidth / 2, scaledRadius, xRange;
                var vlHist, vlMean, vlPerc, vlCount;

                addAxis(bgrYDomain);

                if (bgrCount > 50) {

                    if (bgrVlJson.facets.count > 0) {

                        vlHist = bgrVlJson.facets.denplot.buckets;
                        vlMean = bgrVlJson.facets.pmean;
                        vlPerc = bgrVlJson.facets.pperc;
                        vlCount = bgrVlJson.facets.count;

                        //addViolin(gs, vlHist, [height - margin.bottom, margin.top], boxWidth, yDomain, resolution, interpolation, false);
                        addViolin(gb, vlHist, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, resolution, interpolation, false);

                        addBoxPlot(gb, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                    }

                } else if (bgrCount >= 10 && bgrCount <= 50) {
                    // Manageable data-points, just do a beeswarm with a box-plot
                    var bgrBsPromise = $.getJSON(bgrBsUrl);
                    bgrBsPromise.fail(function () {
                        console.log('Failed while loading irBeeswarm')
                    });

                    // generate the beeswarm
                    bgrBsPromise.done(function (bgrBsJson) {

                        if (bgrBsJson.grouped.phenotype_value_type_s.matches > 0) {
                            firstResult = bgrBsJson.grouped.phenotype_value_type_s.groups[0];

                            xaxis = boxWidth / 2;
                            dataset = [];

                            scaledRadius = 4 * (pMax - pMin) / boxWidth;
                            firstResult.doclist.docs.forEach(function (element, index) {

                                dataset.push({
                                    x: undefined,
                                    y: element.phenotype_value_f,
                                    species: element.species_category[0],
                                    insecticide: element.insecticide_s
                                });

                            });

                            beeswarm = new Beeswarm(dataset, 0, scaledRadius);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gb, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }
                        if (bgrVlJson.facets.count > 0) {

                            vlHist = bgrVlJson.facets.denplot.buckets;
                            vlMean = bgrVlJson.facets.pmean;
                            vlPerc = bgrVlJson.facets.pperc;
                            vlCount = bgrVlJson.facets.count;

                            addBoxPlot(gb, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                        }

                    });

                } else {
                    // Very few data-points, just do a beeswarm
                    var bgrBsPromise = $.getJSON(bgrBsUrl);
                    bgrBsPromise.fail(function () {
                        console.log('Failed while loading irBeeswarm')
                    });

                    // generate the beeswarm
                    bgrBsPromise.done(function (bgrBsJson) {
                        // generate the beeswarm
                        if (bgrBsJson.grouped.phenotype_value_type_s.matches > 0) {
                            firstResult = bgrBsJson.grouped.phenotype_value_type_s.groups[0];

                            dataset = [];

                            scaledRadius = 4 * (pMax - pMin) / boxWidth;
                            firstResult.doclist.docs.forEach(function (element, index) {

                                dataset.push({
                                    x: undefined,
                                    y: element.phenotype_value_f,
                                    species: element.species_category[0],
                                    insecticide: element.insecticide_s
                                });

                            });

                            beeswarm = new Beeswarm(dataset, 0, scaledRadius);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gb, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }
                    });

                }
                // Initialize selection urls and promises
                var selBsUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irBeeswarm?&' + qryUrl + '&fq=phenotype_value_type_s:"' + pType
                    + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + BBox + '&json.wrf=?&callback=?';

                var selVlUrl = 'http://funcgen.vectorbase.org/popbio-map-preview/asolr/solr/vb_popbio/irViolin?&' + qryUrl + '&fq=phenotype_value_type_s:"' + pType
                    + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' + JSON.stringify(vlJsonFacet) + BBox + '&json.wrf=?&callback=?';
                var selBsPromise = $.getJSON(selBsUrl),
                    selVlPromise = $.getJSON(selVlUrl);


                //addAxis();

                $.when(selBsPromise, selVlPromise).done(function (bsJson, vlJson) {
                    // background graph
                    // selection graph
                    var gs = svg.append("g").attr("transform", "translate(" + (1 * (boxWidth + boxSpacing) + margin.left) + ",0)");

                    var dataset, // store the points to be plotted
                        firstResult, beeswarm, xaxis = boxWidth / 2, scaledRadius, xRange;
                    var vlHist, vlMean, vlPerc, vlCount;

                    if (pCount > 50) {

                        if (vlJson[0].facets.count > 0) {

                            vlHist = vlJson[0].facets.denplot.buckets;
                            vlMean = vlJson[0].facets.pmean;
                            vlPerc = vlJson[0].facets.pperc;
                            vlCount = vlJson[0].facets.count;

                            //addViolin(gs, vlHist, [height - margin.bottom, margin.top], boxWidth, yDomain, resolution, interpolation, false);
                            addViolin(gs, vlHist, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, resolution, interpolation, false);

                            addBoxPlot(gs, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                        }

                    } else if (pCount >= 10 && pCount <= 50) {
                        // Manageable data-points, just do a beeswarm with a box-plot

                        // generate the beeswarm

                        if (bsJson[0].grouped.phenotype_value_type_s.matches > 0) {
                            firstResult = bsJson[0].grouped.phenotype_value_type_s.groups[0];

                            xaxis = boxWidth / 2;
                            dataset = [];

                            scaledRadius = 4 * (pMax - pMin) / boxWidth;
                            firstResult.doclist.docs.forEach(function (element, index) {

                                dataset.push({
                                    x: undefined,
                                    y: element.phenotype_value_f,
                                    species: element.species_category[0],
                                    insecticide: element.insecticide_s
                                });

                            });

                            beeswarm = new Beeswarm(dataset, 0, scaledRadius);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gs, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }
                        if (vlJson[0].facets.count > 0) {

                            vlHist = vlJson[0].facets.denplot.buckets;
                            vlMean = vlJson[0].facets.pmean;
                            vlPerc = vlJson[0].facets.pperc;
                            vlCount = vlJson[0].facets.count;

                            addBoxPlot(gs, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                        }


                    } else {
                        // Very few data-points, just do a beeswarm

                        // generate the beeswarm
                        if (bsJson[0].grouped.phenotype_value_type_s.matches > 0) {
                            firstResult = bsJson[0].grouped.phenotype_value_type_s.groups[0];

                            dataset = [];

                            scaledRadius = 4 * (pMax - pMin) / boxWidth;
                            firstResult.doclist.docs.forEach(function (element, index) {

                                dataset.push({
                                    x: undefined,
                                    y: element.phenotype_value_f,
                                    species: element.species_category[0],
                                    insecticide: element.insecticide_s
                                });

                            });

                            beeswarm = new Beeswarm(dataset, 0, scaledRadius);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gs, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }


                    }
                });

                selBsPromise.fail(function () {
                    console.log('Failed while loading irBeeswarm')
                });

                selVlPromise.fail(function () {
                    console.log('Failed while loading irViolin')
                });
            });


            bgrVlPromise.fail(function () {
                console.log('Failed while loading irViolin')
            });
        })
        .fail(function () {
            console.log('Failed while loading irViolin')
        });

    function addAxis(yDomain) {
        var yIR = d3.scale.linear()
            .range([height - margin.bottom, margin.top])
            .domain(yDomain)
            .nice();

        var yAxis = d3.svg.axis()
            .scale(yIR)
            .orient("left");

        svg.append("g")
            .attr('class', 'axis')
            .attr("transform", "translate(" + margin.left + ",0)")
            .call(yAxis);

        svg.append("text")
            .attr("x", margin.left + boxWidth + boxSpacing / 2)
            .attr("y", 10)
            .style("text-anchor", "middle")
            .text(pType.capitalizeFirstLetter());

        svg.append("text")
            .attr("x", margin.left + boxWidth / 2)
            .attr("y", height - margin.bottom / 2)
            .style("text-anchor", "middle")
            .text("Background");

        svg.append("text")
            .attr("x", margin.left + boxWidth + boxSpacing + boxWidth / 2)
            .attr("y", height - margin.bottom / 2)
            .style("text-anchor", "middle")
            .text("Selection");

    }
}


