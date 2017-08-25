/**
 * Created by Ioannis on 18/6/2015.
 */
// Class: Violin --------------------------------------------- //

function createBeeViolinPlot(divid, filter) {

    "use strict";
    $('#swarm-plots h3').text('Insecticide Resistance statistics for selected samples');

    // Only proceed if in IR mode, otherwise clear the graph
    if ($('#SelectView').val() === 'smpl') {

        $(divid).html(
            '<div style="text-align: center; margin-top: 30px">' +
            '<i class="fa fa-area-chart" style="color: #C3312D; font-size: 12em"></i>' +
            '<h1>Ooops</h1>' +
            '<h4>this plot type only works with Insecticide Resistance data</h4>' +
            '<h4>switch to IR phenotypes view and try again</h4>' +
            '</div>'
        );
        return;
    }

    var self = this;
    var url = solrPopbioUrl + 'irViolinStats?&' + qryUrl + filter + '&json.wrf=?&callback=?';

    // store the selected plot type

    // fade-out the graph

    $('#swarm-chart-area').fadeOut();

    $.getJSON(url)
        .done(function (json) {
            PaneSpin('swarm-plots', 'start');

            if (json.facets.count && json.facets.count > 0) {

                setTimeout(function () {
                    $(divid).empty();

                    // let's create and populate a drop down
                    var label = $('<label>').text('Phenotypes included in background: ');
                    var bs = $('<select />').attr('id', 'bgPlotType')
                        .attr('class', "form-control");
                    //ToDo: Uncomment next line to convert to a bootstrap-select
                    //.attr('class', "selectpicker");
                    $('<option/>', {
                        text: 'phenotypes matching search',
                        value: 1
                    }).appendTo(bs);
                    $('<option/>', {
                        text: 'phenotypes visible on map (including the ones behind this panel)',
                        value: 2
                    }).appendTo(bs);
                    $('<option/>', {
                        text: 'all phenotypes',
                        value: 3
                    }).appendTo(bs);
                    label.appendTo($(divid));
                    // set to selected value
                    bs.val(bgPlotType)
                        .appendTo($(divid));

                    //ToDo: Uncomment next line to convert to a bootstrap-select
                    //$('#bgPlotType').selectpicker('refresh');

                    // let's create and populate a drop down
                    label = $('<label>').text('Measurement type: ');
                    var s = $('<select />').attr('id', 'plotType')
                        .attr('class', "form-control");

                    // add options to the selection box, store additional info into data
                    json.facets.vtypes.buckets.forEach(function (element) {
                            var i = 0;
                            element.vunits.buckets.forEach(function (innElement) {
                                var optionText = element.val + ' (' + innElement.val + '): ' + innElement.count + ' phenotypes';
                                $('<option/>', {
                                    text: optionText,
                                    value: element.val + '-' + innElement.val,
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

                    label.appendTo($(divid));
                    s.appendTo($(divid));

                    // check if there was a previous selection and if it currently exists
                    if (selectedPlotType !== 'none' && $('#plotType option[value="' + selectedPlotType + '"]').length > 0) {
                        $('#plotType').val(selectedPlotType);

                    }

                    // build the graph using the first option in the drop-down
                    var selectionData = s.find(':selected').data();

                    // build the graph using the first option in the drop-down
                    // var selectionData = s.find(':selected').data();

                    //buildBackgroundPlot(divid, filter, selectionData);
                    buildPlot(divid, filter, selectionData);

                    // build a new graph whenever selection is changed
                    s.change(function () {
                        PaneSpin('swarm-plots', 'start');
                        selectionData = s.find(':selected').data();
                        $('#beeViolinPlot').fadeOut();

                        setTimeout(function () {
                            buildPlot(divid, filter, selectionData);

                        }, delay);
                    });
                    bs.change(function () {
                        PaneSpin('swarm-plots', 'start');
                        selectionData = s.find(':selected').data();
                        // remember selection
                        bgPlotType = bs.find(':selected').val();
                        $('#beeViolinPlot').fadeOut();
                        setTimeout(function () {
                            buildPlot(divid, filter, selectionData);

                        }, delay);
                    });

                }, delay);

            }
            // $(document).trigger("jsonLoaded");

        })
        .fail(function () {
            PaneSpin('swarm-plots', 'stop');
            // $(document).trigger("jsonLoaded");

            console.log('Failed while loading irViolinStats')
        });

}

function addViolin(svg, results, yRange, width, yDomain, resolution, interpolation, log) {

    "use strict";

    // add an extra (duplicated) value to the end of the results array, for a better visual pepresentation of the violin
    // plot

    var resLen = results.length - 1;
    var lastCount = results[resLen].count, lastVal = results[resLen].val;
    var x, dx = (yDomain[1] - yDomain[0]) / resolution;
    results.push({val: lastVal + dx, count: lastCount});
    // for x axis
    var y = d3.scale.linear()
        .range([width / 2, 0])
        .domain([0, Math.max(d3.max(results, function (d) {
            return d.count * 1.5;
        }))]); //0 -  max probability

    var tooltip = d3.select('#plotTooltip');

    if (log) {
        x = d3.scale.log()
            .range(yRange)
            .domain(yDomain)
            .nice();
    } else {
        // for y axis
        x = d3.scale.linear()
            .range(yRange)
            .domain(yDomain)
            .nice();
    }

// Append marker
    var marker = svg.append('circle')
        .attr('r', 7)
        .style('display', 'none')
        .style('fill', '#FFFFFF')
        .style('pointer-events', 'none')
        .style('stroke', '#FB5050')
        .style('stroke-width', '3px');

// Create custom bisector
    var bisect = d3.bisector(function (datum) {
        return datum.val;
    }).left;

    var area = d3.svg.area()
        .interpolate(interpolation)
        .x(function (d) {
            return x(d.val)
            //return x(d.val + dx)
        })
        .y0(width / 2)
        .y1(function (d) {
            return y(d.count);
        });

    var line = d3.svg.line()
        .interpolate(interpolation)
        .x(function (d) {
            return x(d.val);
            //return x(d.val + dx);
        })
        .y(function (d) {
            return y(d.count);
        });

    var gPlus = svg.append("g");
    var gMinus = svg.append("g");

    gPlus.append("path")
        .datum(results)
        .attr("class", "area")
        .attr("d", area)
        .on('mouseover', function () {
            tooltip.transition()
                .duration(100)
                .style("opacity", 1)
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on('mousemove', function (d) {
            var mouse = d3.mouse(this);
            var xx = x.invert(mouse[0]),
                index = bisect(d, xx);
            var length = d.length - 1;
            if (index === 0) {
                var bin = 'Range: ' + d[index].val.roundDecimals(4) + '-' + (d[index].val + dx).roundDecimals(4);
                var count = d[index].count;
            } else if (index < length) {
                var bin = 'Range: ' + d[index - 1].val.roundDecimals(4) + '-' + (d[index - 1].val + dx).roundDecimals(4);
                var count = d[index - 1].count;
            } else {
                var bin = 'Range: ' + d[length - 1].val.roundDecimals(4) + '-' + (d[length - 1].val + dx).roundDecimals(4);
                var count = d[length - 1].count;
            }
            var tooltipHtml = '<h3 style="background-color: #CCCCCC;"><span style="color: rgb(255, 255, 255); ">Count of phenotypes</span></h3><p>%BIN</p><p><b>%COUNT</b></p>'
                .replace('%BIN', bin).replace('%COUNT', count);
            tooltip.html(tooltipHtml)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px")
        });

    gPlus.append("path")
        .datum(results)
        .attr("class", "violin")
        .attr("d", line);

    gMinus.append("path")
        .datum(results)
        .attr("class", "area")
        .attr("d", area)
        .on('mouseover', function () {
            tooltip.transition()
                .duration(100)
                .style("opacity", 1)
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on('mousemove', function (d) {
            var mouse = d3.mouse(this);
            var xx = x.invert(mouse[0]),
                index = bisect(d, xx);
            var length = d.length - 1;
            if (index === 0) {
                var bin = 'Range: ' + d[index].val.roundDecimals(4) + '-' + (d[index].val + dx).roundDecimals(4);
                var count = d[index].count;
            } else if (index < length) {
                var bin = 'Range: ' + d[index - 1].val.roundDecimals(4) + '-' + (d[index - 1].val + dx).roundDecimals(4);
                var count = d[index - 1].count;
            } else {
                var bin = 'Range: ' + d[length - 1].val.roundDecimals(4) + '-' + (d[length - 1].val + dx).roundDecimals(4);
                var count = d[length - 1].count;
            }
            var tooltipHtml = '<h3 style="background-color: #CCCCCC;"><span style="color: rgb(255, 255, 255); ">Count of phenotypes</span></h3><p>%BIN</p><p><b>%COUNT</b></p>'
                .replace('%BIN', bin).replace('%COUNT', count);
            tooltip.html(tooltipHtml)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px")
        });

    gMinus.append("path")
        .datum(results)
        .attr("class", "violin")
        .attr("d", line);

    gPlus.attr("transform", "rotate(90,0,0)  translate(0,-" + width + ")");//translate(0,-200)");
    gMinus.attr("transform", "rotate(90,0,0) scale(1,-1)");

}

function addBoxPlot(svg, elmProbs, elmMean, yRange, width, yDomain, boxPlotWidth, log) {

    "use strict";
    var tooltip = d3.select('#plotTooltip');
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

    gBoxPlot.append("rect")
        .attr("class", "boxplot")
        .attr("x", x(left))
        .attr("width", x(right) - x(left))
        .attr("y", probs[3])
        .attr("height", -probs[3] + probs[1]);

    var iS = [[0, 1], [3, 4]];
    for (i = 0; i < iS.length; i++) {
        gBoxPlot.append("line")
            .attr("class", "boxplot")
            .attr("x1", x(0.5))
            .attr("x2", x(0.5))
            .attr("y1", probs[iS[i][0]])
            .attr("y2", probs[iS[i][1]]);
    }

    iS = [0, 1, 2, 3, 4];
    var iSclass = ["", "", "median", "", ""];
    var iStooltips = [
        '<h3 style="background-color: #000000;"><span style="color: white; ">5th percentile</span></h3><p><b>%VALUE</b></p>',
        '<h3 style="background-color: #000000;"><span style="color: white; ">25th percentile</span></h3><p><b>%VALUE</b></p>',
        '<h3 style="background-color: #FF0000;"><span style="color: white; ">Median</span></h3><p><b>%VALUE</b></p>',
        '<h3 style="background-color: #000000;"><span style="color: white; ">75th percentile</span></h3><p><b>%VALUE</b></p>',
        '<h3 style="background-color: #000000;"><span style="color: white; ">95th percentile</span></h3><p><b>%VALUE</b></p>'
    ];

    function constructHTML(elm, html) {
        return html;
    }

    for (var i = 0; i < iS.length; i++) {
        (function (e) {
            var html = iStooltips[i].replace("%VALUE", elmProbs[iS[i]].roundDecimals(4));
            gBoxPlot.append("line")
                .attr("class", "boxplot " + iSclass[i])
                .attr("x1", x(left))
                .attr("x2", x(right))
                .attr("y1", probs[iS[i]])
                .attr("y2", probs[iS[i]])
                .on("mouseover", function () {
                    tooltip.transition()
                        .duration(100)
                        .style("opacity", 1);
                    tooltip.html(html)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")

                })
                .on("mouseout", function (d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

        })(i);

    }

    var tooltipHtml = '<h3 style="background-color: #FF0000;"><font color="white">Mean</font></h3><p><b>' + elmMean.roundDecimals(4) + '</b></p>';
    gBoxPlot.append("circle")
        .attr("class", "boxplot mean")
        .attr("cx", x(0.5))
        .attr("cy", y(elmMean))
        .attr("r", x(boxPlotWidth / 5))
        .on("mouseover", function () {
            tooltip.transition()
                .duration(100)
                .style("opacity", 1);
            tooltip.html(tooltipHtml)
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px")

        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

}

function addBeeswarm(svg, points, yRange, xRange, yDomain, xDomain, log) {

    "use strict";

    var y, tooltip = d3.select('#beeswarmPointTooltip');

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

        var point = points.data[i];
        var color = point.bgColor, value = point.y;

        var dates = point.collectionDate;
        var frmDate;

        // convert a pair of dates (date range) to a string
        if (dates && dates.length > 1) {

            var startDate = new Date(dates[0]), endDate = new Date(dates[1]);
            frmDate = startDate.toDateString() + '-' + endDate.toDateString();
        } else if (dates && dates.length > 0) {
            var date = new Date(dates[0]);
            frmDate = date.toDateString();
        }

        point.collectionDate = frmDate;

        var species = point.species ? point.species : 'Unknown';

        point.species = species;

        var template = $.templates("#irBsPointTemplate");
        var tooltipHtml = template.render(point);

        gSwarmPlot.append("circle")
            .attr("cx", x(p.x))
            .attr("cy", y(p.y))
            .attr("r", 4)
            .style("fill", color)
            .on("mouseover", function (d) {
                if (stickyHover) return;
                $('#cancel-hover').css("display", "none");
                tooltip.transition()
                    .duration(delay)
                    .style("opacity", 1)
                    .style("z-index", 1000000);

                tooltip.html(tooltipHtml);
                var winHeight = window.innerHeight;
                var tooltipHeight = tooltip.node().getBoundingClientRect().height;
                var tooltipY;

                if (d3.event.pageY - 8 + tooltipHeight > winHeight) {
                    tooltipY = d3.event.pageY - tooltipHeight + 28;
                } else {
                    tooltipY = d3.event.pageY - 28;
                }

                tooltip.style("left", (d3.event.pageX + 20) + "px")
                    .style("top", (tooltipY) + "px")

            })
            .on("mouseout", function (d) {
                if (stickyHover) return;
                tooltip.transition()
                    .duration(delay)
                    .style("opacity", 0)
                    .style("z-index", -1000000);
            })
            .on("click", function () {
                tooltip.transition()
                    .duration(0)
                    .style("opacity", 1)
                    .style("z-index", 1000000);

                tooltip.html(tooltipHtml);
                var winHeight = window.innerHeight;
                var tooltipHeight = tooltip.node().getBoundingClientRect().height;
                var tooltipY;

                if (d3.event.pageY - 8 + tooltipHeight > winHeight) {
                    tooltipY = d3.event.pageY - tooltipHeight + 28;
                } else {
                    tooltipY = d3.event.pageY - 28;
                }

                tooltip.style("left", (d3.event.pageX + 20) + "px")
                    .style("top", (tooltipY) + "px")

                stickyHover = true;

                $('#no-interactions').addClass("in").addClass("foreground")
                // $('#no-interactions').addClass("foreground")
                    .one("click", function () {
                        tooltip.transition()
                            .duration(delay)
                            .style("opacity", 0)
                            .style("z-index", -1000000);
                        $('#no-interactions').removeClass("in").removeClass("foreground");
                        $(document).off('click', '#cancel-hover');

                        stickyHover = false;

                    });

                $('#cancel-hover').css("display", "inline")
                    .one("click", function () {
                        tooltip.transition()
                            .duration(delay)
                            .style("opacity", 0)
                            .style("z-index", -1000000);
                        $('#no-interactions').removeClass('in').removeClass("foreground").off('click');
                        stickyHover = false;

                    });
            });

    });

}

function buildPlot(divid, filter, selection) {
    "use strict";

    var bgrCount, pCount = selection.count, pMin = selection.min, pMax = selection.max,
        pType = selection.phenotype_value_type_s, pUnit = selection.phenotype_value_unit_s;
    var width = 380, height = 500;
    var plotDiv = d3.select(divid);
    var resolution = 25, interpolation = 'basis';
    var log = false;
    // exclude extreme outliers
    if (pCount < 3) {
        var vlJsonFacet = {
            pmin: "min(phenotype_value_f)",
            pmax: "max(phenotype_value_f)"
        };
    } else {

        var vlJsonFacet = {
            pmin: "percentile(phenotype_value_f,1)",
            pmax: "percentile(phenotype_value_f,99)"
        };
    }

    var mapBounds = buildBbox(map.getBounds());

    if (d3.select('#beeViolinPlot')) d3.select('#beeViolinPlot').remove();
    var svg = plotDiv.append("svg")
        .attr('width', width)
        .attr('height', height)
        .attr("style", 'width: ' + width + 'px; height: ' + height + 'px; border: 0; padding-top:10px')
        .attr("id", "beeViolinPlot");

    var boxWidth = 150, boxSpacing = 10;
    var margin = {top: 25, bottom: 65, left: 40, right: 20};

    // Initialize background urls and promises
    var bgrBsUrl, bgrVlUrl;

    switch ($('#bgPlotType').val()) {
        // Phenotypes matching search terms
        case "1":
            bgrVlUrl = solrPopbioUrl + 'irViolin?&' + qryUrl +
                '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' +
                JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';

            break;
        // Phenotypes visible on map
        case "2":
            bgrVlUrl = solrPopbioUrl + 'irViolin?&' + qryUrl +
                mapBounds + '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' +
                JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
            break;
        // All phenotypes
        case "3":
            bgrVlUrl = solrPopbioUrl + 'irViolin?&' + 'q=*' +
                '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' +
                JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
            break;
        default:
            break;
    }

    $.getJSON(bgrVlUrl)
        .done(function (bgrVlJson) {
            bgrCount = bgrVlJson.response.numFound;
            var bgrMin = bgrVlJson.facets.pmin, bgrMax = bgrVlJson.facets.pmax;
            var rangeFq = "&fq=phenotype_value_f:[" + bgrMin + ' TO ' + bgrMax + ']';

            if (pUnit === 'percent' && pType === 'mortality rate') {
                bgrMin = 0;
                bgrMax = 100;
            }
            vlJsonFacet = {
                pmean: "avg(phenotype_value_f)",
                pperc: "percentile(phenotype_value_f,5,25,50,75,95)",
                pmin: "min(phenotype_value_f)",
                pmax: "max(phenotype_value_f)",
                //pmin: "percentile(phenotype_value_f,1)",
                //pmax: "percentile(phenotype_value_f,99)",
                denplot: {
                    type: "range",
                    field: "phenotype_value_f",
                    gap: (bgrMax - bgrMin) / resolution,
                    start: bgrMin,
                    end: bgrMax,
                    include: 'edge'
                }
            };

            // rebuild the urls now that we have the min and max values
            switch ($('#bgPlotType').val()) {
                // Phenotypes matching search terms
                case "1":
                    bgrBsUrl = solrPopbioUrl + 'irBeeswarm?&' + qryUrl + rangeFq +
                        '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + '&json.wrf=?&callback=?';
                    bgrVlUrl = solrPopbioUrl + 'irViolin?&' + qryUrl + rangeFq +
                        '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' +
                        JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
                    break;
                // Phenotypes visible on map
                case "2":
                    bgrBsUrl = solrPopbioUrl + 'irBeeswarm?&' + qryUrl + rangeFq +
                        mapBounds + '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' +
                        '&json.wrf=?&callback=?';
                    bgrVlUrl = solrPopbioUrl + 'irViolin?&' + qryUrl + rangeFq +
                        mapBounds + '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit +
                        '"&json.facet=' + JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
                    break;
                // All phenotypes
                case "3":
                    bgrBsUrl = solrPopbioUrl + 'irBeeswarm?&' + 'q=*' + rangeFq +
                        '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + '&json.wrf=?&callback=?';
                    bgrVlUrl = solrPopbioUrl + 'irViolin?&' + 'q=*' + rangeFq +
                        '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' +
                        JSON.stringify(vlJsonFacet) + '&json.wrf=?&callback=?';
                    break;
                default:
                    break;
            }

            // build background plot
            var bgrVlPromise = $.getJSON(bgrVlUrl);
            bgrVlPromise.done(function (bgrVlJson) {

                var gb = svg.append("g").attr("transform", "translate(" + (0 * (boxWidth + boxSpacing) + margin.left) + ",0)");

                var fltBgrCount = bgrVlJson.response.numFound;
                //, fltBgrMin = bgrVlJson.facets.pmin, fltBgrMax = bgrVlJson.facets.pmax;
                if (pUnit === 'percent' && pType === 'mortality rate') {
                    bgrMin = 0;
                    bgrMax = 100;
                }

                var bgrYDomain = [bgrMin, bgrMax];

                var dataset, // store the points to be plotted
                    firstResult, beeswarm, xaxis = boxWidth / 2, scaledRadius, xRange;
                var vlHist, vlMean, vlPerc, vlCount;

                //addAxis(bgrYDomain, fltBgrCount, pCount);

                if (fltBgrCount > 50) {

                    if (bgrVlJson.facets.count > 0) {

                        vlHist = bgrVlJson.facets.denplot.buckets;
                        vlMean = bgrVlJson.facets.pmean;
                        vlPerc = bgrVlJson.facets.pperc;
                        vlCount = bgrVlJson.facets.count;

                        addViolin(gb, vlHist, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, resolution, interpolation, false);

                        addBoxPlot(gb, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                    }

                } else if (fltBgrCount >= 10 && fltBgrCount <= 50) {
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

                            scaledRadius = (4 * (bgrMax - bgrMin) / boxWidth).toFixed(6);
                            var scaleFactor = getScaleFactor(scaledRadius);
                            var factoredRadius = scaledRadius * scaleFactor;

                            firstResult.doclist.docs.forEach(function (element, index) {
                                buildDataset(dataset, element);

                            });

                            //beeswarm = new Beeswarm(dataset, 0, scaledRadius);
                            beeswarm = new Beeswarm(dataset, 0, factoredRadius, scaleFactor);
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

                            //scaledRadius = 4 * (bgrMax - bgrMin) / boxWidth;
                            scaledRadius = (4 * (bgrMax - bgrMin) / boxWidth).toFixed(6);
                            var scaleFactor = getScaleFactor(scaledRadius);
                            var factoredRadius = scaledRadius * scaleFactor;

                            firstResult.doclist.docs.forEach(function (element, index) {
                                buildDataset(dataset, element);

                            });

                            beeswarm = new Beeswarm(dataset, 0, factoredRadius, scaleFactor);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gb, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }
                    });

                }
                // Initialize selection urls and promises
                var selBsUrl = solrPopbioUrl + 'irBeeswarm?&' + qryUrl + rangeFq +
                    '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"' + filter + '&json.wrf=?&callback=?';

                var selVlUrl = solrPopbioUrl + 'irViolin?&' + qryUrl + rangeFq +
                    '&fq=phenotype_value_type_s:"' + pType + '"&fq=phenotype_value_unit_s:"' + pUnit + '"&json.facet=' +
                    JSON.stringify(vlJsonFacet) + filter + '&json.wrf=?&callback=?';
                var selBsPromise = $.getJSON(selBsUrl),
                    selVlPromise = $.getJSON(selVlUrl);

                $.when(selBsPromise, selVlPromise).done(function (bsJson, vlJson) {

                    // selection graph
                    var fltPCount = vlJson[0].response.numFound, fltPMin = vlJson[0].facets.pmin,
                        fltPMax = vlJson[0].facets.pmax;

                    var gs = svg.append("g").attr("transform", "translate(" + (1 * (boxWidth + boxSpacing) + margin.left) + ",0)");

                    var dataset, // store the points to be plotted
                        firstResult, beeswarm, xaxis = boxWidth / 2, scaledRadius, xRange;
                    var vlHist, vlMean, vlPerc, vlCount;

                    if (fltPCount > 50) {

                        if (vlJson[0].facets.count > 0) {

                            vlHist = vlJson[0].facets.denplot.buckets;
                            vlMean = vlJson[0].facets.pmean;
                            vlPerc = vlJson[0].facets.pperc;
                            //vlCount = vlJson[0].facets.count;

                            addViolin(gs, vlHist, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, resolution, interpolation, false);

                            addBoxPlot(gs, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                        }

                    } else if (fltPCount >= 10 && fltPCount <= 50) {
                        // Manageable data-points, just do a beeswarm with a box-plot

                        // generate the beeswarm

                        if (bsJson[0].grouped.phenotype_value_type_s.matches > 0) {
                            firstResult = bsJson[0].grouped.phenotype_value_type_s.groups[0];

                            xaxis = boxWidth / 2;
                            dataset = [];

                            //scaledRadius = 4 * (bgrMax - bgrMin) / boxWidth;
                            scaledRadius = (4 * (bgrMax - bgrMin) / boxWidth).toFixed(6);
                            var scaleFactor = getScaleFactor(scaledRadius);
                            var factoredRadius = scaledRadius * scaleFactor;

                            firstResult.doclist.docs.forEach(function (element, index) {
                                buildDataset(dataset, element);

                            });

                            beeswarm = new Beeswarm(dataset, 0, factoredRadius, scaleFactor);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gs, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }
                        if (vlJson[0].facets.count > 0) {

                            //vlHist = vlJson[0].facets.denplot.buckets;
                            vlMean = vlJson[0].facets.pmean;
                            vlPerc = vlJson[0].facets.pperc;
                            //vlCount = vlJson[0].facets.count;

                            addBoxPlot(gs, vlPerc, vlMean, [height - margin.bottom, margin.top], boxWidth, bgrYDomain, .15, false);
                        }

                    } else {
                        // Very few data-points, just do a beeswarm

                        // generate the beeswarm
                        if (bsJson[0].grouped.phenotype_value_type_s.matches > 0) {
                            firstResult = bsJson[0].grouped.phenotype_value_type_s.groups[0];

                            dataset = [];

                            //scaledRadius = 4 * (bgrMax - bgrMin) / boxWidth;

                            scaledRadius = (4 * (bgrMax - bgrMin) / boxWidth).toFixed(6);
                            var scaleFactor = getScaleFactor(scaledRadius);
                            var factoredRadius = scaledRadius * scaleFactor;

                            firstResult.doclist.docs.forEach(function (element, index) {
                                buildDataset(dataset, element);

                            });

                            beeswarm = new Beeswarm(dataset, 0, factoredRadius, scaleFactor);
                            // make sure the beeswarm points are plotted next to each other
                            xRange = [(boxWidth - 8 * beeswarm.maxPoints) / 2, (boxWidth - 8 * beeswarm.maxPoints) / 2 + 8 * beeswarm.maxPoints];
                            // unless there are to many, then let them overlap
                            if (8 * beeswarm.maxPoints > boxWidth) xRange = [0, boxWidth];

                            addBeeswarm(gs, beeswarm, [height - margin.bottom, margin.top], xRange, bgrYDomain, beeswarm.domain, false);
                        }

                    }
                    addAxis(bgrYDomain, fltBgrCount, bgrCount - fltBgrCount, fltPCount, pCount - fltPCount);

                    // stop spinner
                    PaneSpin('swarm-plots', 'stop');

                    $('#swarm-chart-area').fadeIn();
                    $('#beeViolinPlot').fadeIn();

                });

                selBsPromise.fail(function () {
                    console.log('Failed while loading irBeeswarm')
                    PaneSpin('swarm-plots', 'stop');
                });

                selVlPromise.fail(function () {
                    console.log('Failed while loading irViolin')
                    PaneSpin('swarm-plots', 'stop');
                });
            });

            bgrVlPromise.fail(function () {
                console.log('Failed while loading irViolin')
            });
            // $(document).trigger("jsonLoaded");

        })
        .fail(function () {
            // $(document).trigger("jsonLoaded");
            // $('#beeViolinPlot').fadeIn();
            console.log('Failed while loading irViolin')
        });

    function addAxis(yDomain, bgrCount, bgrOutliers, selCount, selOutliers) {
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
            .attr("y", height - margin.bottom + 24)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .text("Background");

        svg.append("text")
            .attr("x", margin.left + boxWidth / 2)
            .attr("y", height - margin.bottom + 40)
            .style("text-anchor", "middle")
            .text("n=" + bgrCount);

        if (bgrOutliers > 0) {
            svg.append("text")
                .attr("x", margin.left + boxWidth / 2)
                .attr("y", height - margin.bottom + 54)
                .style("text-anchor", "middle")
                .text(bgrOutliers > 1 ? bgrOutliers + " outliers excluded" : bgrOutliers + " outlier excluded");
        }

        svg.append("text")
            .attr("x", margin.left + boxWidth + boxSpacing + boxWidth / 2)
            .attr("y", height - margin.bottom + 22)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .text("Selection");

        svg.append("text")
            .attr("x", margin.left + boxWidth + boxSpacing + boxWidth / 2)
            .attr("y", height - margin.bottom + 40)
            .style("text-anchor", "middle")
            .text("n=" + selCount);

        if (selOutliers > 0) {
            svg.append("text")
                .attr("x", margin.left + boxWidth + boxSpacing + boxWidth / 2)
                .attr("y", height - margin.bottom + 54)
                .style("text-anchor", "middle")
                .text(selOutliers > 1 ? selOutliers + " outliers excluded" : selOutliers + " outlier excluded");
        }

    }
}

function getScaleFactor(x) {
    x = parseFloat(x) + "";
    var scale = x.indexOf(".");
    if (scale == -1) return 1;
    return Math.pow(10, (x.length - scale - 1));
}

function buildDataset(dataset, element) {
    var species = element.species_category ? element.species_category[0] : 'Unknown';
    var bgColor;
    if (glbSummarizeBy === 'Species') {
        bgColor = legend.options.palette[species]
    } else {
        var field = mapSummarizeByToField(glbSummarizeBy).field;
        var fieldContents = element[field];
        if (fieldContents) {
            typeof fieldContents === 'object' ? bgColor = legend.options.palette[fieldContents[0]] : bgColor = legend.options.palette[fieldContents];

        } else {
            bgColor = legend.options.palette['Unknown']
        }

    }

    dataset.push({
        x: undefined,
        y: element.phenotype_value_f,
        species: element.species_category,
        speciesType: 'Taxonomy',
        insecticide: element.insecticide_s,
        insecticideType: 'Insecticides',
        concentration: element.concentration_f,
        duration: element.duration_f,
        accession: element.accession,
        accessionType: 'Stable ID',
        bundleName: element.bundle_name,
        url: element.url,
        sampleType: element.sample_type,
        sampleTypeType: 'Sample type',
        geoCoords: element.geo_coords,
        geolocation: element.geolocations[0],
        geolocationType: 'Geography',
        bgColor: bgColor,
        textColor: getContrastYIQ(bgColor),
        collectionDate: element.collection_date,
        projects: borderColor('Project', element.projects),
        projectsType: 'Projects',
        collectionProtocols: borderColor('Collection protocol', element.collection_protocols),
        collectionProtocolsType: 'Collection protocols',
        protocols: borderColor('Protocol', element.protocols),
        protocolsType: 'Protocols',
        phenotypeValue: element.phenotype_value_f,
        phenotypeValueType: element.phenotype_value_type_s,
        phenotypeValueUnit: element.phenotype_value_unit_s,
        sampleSize: element.sample_size_i,
        concentrationUnit: element.concentration_unit_s,
        durationUnit: element.duration_unit_s
    });
}
