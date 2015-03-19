/**
 * Created by Ioannis on 19/03/2015.
 * This file was created by copy-pasting the contents of individual js files from the nvd3 library.
 * It provides the absolutely necessary code to plot a pie chart
 * Files included:
 * core.js, interactiveLayer.js, tooltip.js, utils.js from the src folder
 * legend.js, pie.js, pieChart.js from the src/models folder
 */

// set up main nv object on window
var nv = window.nv || {};
window.nv = nv;

// the major global objects under the nv namespace
nv.dev = false; //set false when in production
nv.tooltip = nv.tooltip || {}; // For the tooltip system
nv.utils = nv.utils || {}; // Utility subsystem
nv.models = nv.models || {}; //stores all the possible models/components
nv.charts = {}; //stores all the ready to use charts
nv.graphs = []; //stores all the graphs currently on the page
nv.logs = {}; //stores some statistics and potential error messages

nv.dispatch = d3.dispatch('render_start', 'render_end');

// Function bind polyfill
// Needed ONLY for phantomJS as it's missing until version 2.0 which is unreleased as of this comment
// https://github.com/ariya/phantomjs/issues/10522
// http://kangax.github.io/compat-table/es5/#Function.prototype.bind
// phantomJS is used for running the test suite
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {
            },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                        ? this
                        : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}

//  Development render timers - disabled if dev = false
if (nv.dev) {
    nv.dispatch.on('render_start', function (e) {
        nv.logs.startTime = +new Date();
    });

    nv.dispatch.on('render_end', function (e) {
        nv.logs.endTime = +new Date();
        nv.logs.totalTime = nv.logs.endTime - nv.logs.startTime;
        nv.log('total', nv.logs.totalTime); // used for development, to keep track of graph generation times
    });
}

// Logs all arguments, and returns the last so you can test things in place
// Note: in IE8 console.log is an object not a function, and if modernizr is used
// then calling Function.prototype.bind with with anything other than a function
// causes a TypeError to be thrown.
nv.log = function () {
    if (nv.dev && window.console && console.log && console.log.apply)
        console.log.apply(console, arguments);
    else if (nv.dev && window.console && typeof console.log == "function" && Function.prototype.bind) {
        var log = Function.prototype.bind.call(console.log, console);
        log.apply(console, arguments);
    }
    return arguments[arguments.length - 1];
};

// print console warning, should be used by deprecated functions
nv.deprecated = function (name) {
    if (nv.dev && console && console.warn) {
        console.warn('`' + name + '` has been deprecated.');
    }
};

// render function is used to queue up chart rendering
// in non-blocking timeout functions
nv.render = function render(step) {
    // number of graphs to generate in each timeout loop
    step = step || 1;

    nv.render.active = true;
    nv.dispatch.render_start();

    setTimeout(function () {
        var chart, graph;

        for (var i = 0; i < step && (graph = nv.render.queue[i]); i++) {
            chart = graph.generate();
            if (typeof graph.callback == typeof(Function)) graph.callback(chart);
            nv.graphs.push(chart);
        }

        nv.render.queue.splice(0, i);

        if (nv.render.queue.length) setTimeout(arguments.callee, 0);
        else {
            nv.dispatch.render_end();
            nv.render.active = false;
        }
    }, 0);
};

nv.render.active = false;
nv.render.queue = [];

// main function to use when adding a new graph, see examples
nv.addGraph = function (obj) {
    if (typeof arguments[0] === typeof(Function)) {
        obj = {generate: arguments[0], callback: arguments[1]};
    }

    nv.render.queue.push(obj);

    if (!nv.render.active) {
        nv.render();
    }
};

/* Utility class to handle creation of an interactive layer.
 This places a rectangle on top of the chart. When you mouse move over it, it sends a dispatch
 containing the X-coordinate. It can also render a vertical line where the mouse is located.

 dispatch.elementMousemove is the important event to latch onto.  It is fired whenever the mouse moves over
 the rectangle. The dispatch is given one object which contains the mouseX/Y location.
 It also has 'pointXValue', which is the conversion of mouseX to the x-axis scale.
 */
nv.interactiveGuideline = function () {
    "use strict";

    var tooltip = nv.models.tooltip();

    //Public settings
    var width = null;
    var height = null;

    //Please pass in the bounding chart's top and left margins
    //This is important for calculating the correct mouseX/Y positions.
    var margin = {left: 0, top: 0}
        , xScale = d3.scale.linear()
        , yScale = d3.scale.linear()
        , dispatch = d3.dispatch('elementMousemove', 'elementMouseout', 'elementClick', 'elementDblclick')
        , showGuideLine = true;
    //Must pass in the bounding chart's <svg> container.
    //The mousemove event is attached to this container.
    var svgContainer = null;

    // check if IE by looking for activeX
    var isMSIE = "ActiveXObject" in window;


    function layer(selection) {
        selection.each(function (data) {
            var container = d3.select(this);
            var availableWidth = (width || 960), availableHeight = (height || 400);
            var wrap = container.selectAll("g.nv-wrap.nv-interactiveLineLayer")
                .data([data]);
            var wrapEnter = wrap.enter()
                .append("g").attr("class", " nv-wrap nv-interactiveLineLayer");
            wrapEnter.append("g").attr("class", "nv-interactiveGuideLine");

            if (!svgContainer) {
                return;
            }

            function mouseHandler() {
                var d3mouse = d3.mouse(this);
                var mouseX = d3mouse[0];
                var mouseY = d3mouse[1];
                var subtractMargin = true;
                var mouseOutAnyReason = false;
                if (isMSIE) {
                    /*
                     D3.js (or maybe SVG.getScreenCTM) has a nasty bug in Internet Explorer 10.
                     d3.mouse() returns incorrect X,Y mouse coordinates when mouse moving
                     over a rect in IE 10.
                     However, d3.event.offsetX/Y also returns the mouse coordinates
                     relative to the triggering <rect>. So we use offsetX/Y on IE.
                     */
                    mouseX = d3.event.offsetX;
                    mouseY = d3.event.offsetY;

                    /*
                     On IE, if you attach a mouse event listener to the <svg> container,
                     it will actually trigger it for all the child elements (like <path>, <circle>, etc).
                     When this happens on IE, the offsetX/Y is set to where ever the child element
                     is located.
                     As a result, we do NOT need to subtract margins to figure out the mouse X/Y
                     position under this scenario. Removing the line below *will* cause
                     the interactive layer to not work right on IE.
                     */
                    if (d3.event.target.tagName !== "svg") {
                        subtractMargin = false;
                    }

                    if (d3.event.target.className.baseVal.match("nv-legend")) {
                        mouseOutAnyReason = true;
                    }

                }

                if (subtractMargin) {
                    mouseX -= margin.left;
                    mouseY -= margin.top;
                }

                /* If mouseX/Y is outside of the chart's bounds,
                 trigger a mouseOut event.
                 */
                if (mouseX < 0 || mouseY < 0
                    || mouseX > availableWidth || mouseY > availableHeight
                    || (d3.event.relatedTarget && d3.event.relatedTarget.ownerSVGElement === undefined)
                    || mouseOutAnyReason
                ) {

                    if (isMSIE) {
                        if (d3.event.relatedTarget
                            && d3.event.relatedTarget.ownerSVGElement === undefined
                            && d3.event.relatedTarget.className.match(tooltip.nvPointerEventsClass)) {

                            return;
                        }
                    }
                    dispatch.elementMouseout({
                        mouseX: mouseX,
                        mouseY: mouseY
                    });
                    layer.renderGuideLine(null); //hide the guideline
                    return;
                }

                var pointXValue = xScale.invert(mouseX);
                dispatch.elementMousemove({
                    mouseX: mouseX,
                    mouseY: mouseY,
                    pointXValue: pointXValue
                });

                //If user double clicks the layer, fire a elementDblclick
                if (d3.event.type === "dblclick") {
                    dispatch.elementDblclick({
                        mouseX: mouseX,
                        mouseY: mouseY,
                        pointXValue: pointXValue
                    });
                }

                // if user single clicks the layer, fire elementClick
                if (d3.event.type === 'click') {
                    dispatch.elementClick({
                        mouseX: mouseX,
                        mouseY: mouseY,
                        pointXValue: pointXValue
                    });
                }
            }

            svgContainer
                .on("mousemove", mouseHandler, true)
                .on("mouseout", mouseHandler, true)
                .on("dblclick", mouseHandler)
                .on("click", mouseHandler)
            ;

            //Draws a vertical guideline at the given X postion.
            layer.renderGuideLine = function (x) {
                if (!showGuideLine) return;
                var line = wrap.select(".nv-interactiveGuideLine")
                    .selectAll("line")
                    .data((x != null) ? [nv.utils.NaNtoZero(x)] : [], String);

                line.enter()
                    .append("line")
                    .attr("class", "nv-guideline")
                    .attr("x1", function (d) {
                        return d;
                    })
                    .attr("x2", function (d) {
                        return d;
                    })
                    .attr("y1", availableHeight)
                    .attr("y2", 0)
                ;
                line.exit().remove();

            }
        });
    }

    layer.dispatch = dispatch;
    layer.tooltip = tooltip;

    layer.margin = function (_) {
        if (!arguments.length) return margin;
        margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
        margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
        return layer;
    };

    layer.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return layer;
    };

    layer.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return layer;
    };

    layer.xScale = function (_) {
        if (!arguments.length) return xScale;
        xScale = _;
        return layer;
    };

    layer.showGuideLine = function (_) {
        if (!arguments.length) return showGuideLine;
        showGuideLine = _;
        return layer;
    };

    layer.svgContainer = function (_) {
        if (!arguments.length) return svgContainer;
        svgContainer = _;
        return layer;
    };

    return layer;
};

/* Utility class that uses d3.bisect to find the index in a given array, where a search value can be inserted.
 This is different from normal bisectLeft; this function finds the nearest index to insert the search value.

 For instance, lets say your array is [1,2,3,5,10,30], and you search for 28.
 Normal d3.bisectLeft will return 4, because 28 is inserted after the number 10.  But interactiveBisect will return 5
 because 28 is closer to 30 than 10.

 Unit tests can be found in: interactiveBisectTest.html

 Has the following known issues:
 * Will not work if the data points move backwards (ie, 10,9,8,7, etc) or if the data points are in random order.
 * Won't work if there are duplicate x coordinate values.
 */
nv.interactiveBisect = function (values, searchVal, xAccessor) {
    "use strict";
    if (!(values instanceof Array)) {
        return null;
    }
    if (typeof xAccessor !== 'function') {
        xAccessor = function (d, i) {
            return d.x;
        }
    }

    var bisect = d3.bisector(xAccessor).left;
    var index = d3.max([0, bisect(values, searchVal) - 1]);
    var currentValue = xAccessor(values[index], index);

    if (typeof currentValue === 'undefined') {
        currentValue = index;
    }

    if (currentValue === searchVal) {
        return index; //found exact match
    }

    var nextIndex = d3.min([index + 1, values.length - 1]);
    var nextValue = xAccessor(values[nextIndex], nextIndex);

    if (typeof nextValue === 'undefined') {
        nextValue = nextIndex;
    }

    if (Math.abs(nextValue - searchVal) >= Math.abs(currentValue - searchVal)) {
        return index;
    } else {
        return nextIndex
    }
};

/*
 Returns the index in the array "values" that is closest to searchVal.
 Only returns an index if searchVal is within some "threshold".
 Otherwise, returns null.
 */
nv.nearestValueIndex = function (values, searchVal, threshold) {
    "use strict";
    var yDistMax = Infinity, indexToHighlight = null;
    values.forEach(function (d, i) {
        var delta = Math.abs(searchVal - d);
        if (delta <= yDistMax && delta < threshold) {
            yDistMax = delta;
            indexToHighlight = i;
        }
    });
    return indexToHighlight;
};

/* Tooltip rendering model for nvd3 charts.
 window.nv.models.tooltip is the updated,new way to render tooltips.

 window.nv.tooltip.show is the old tooltip code.
 window.nv.tooltip.* also has various helper methods.
 */
(function () {
    "use strict";
    window.nv.tooltip = {};

    /* Model which can be instantiated to handle tooltip rendering.
     Example usage:
     var tip = nv.models.tooltip().gravity('w').distance(23)
     .data(myDataObject);

     tip();    //just invoke the returned function to render tooltip.
     */
    window.nv.models.tooltip = function () {
        //HTML contents of the tooltip.  If null, the content is generated via the data variable.
        var content = null;

        /*
         Tooltip data. If data is given in the proper format, a consistent tooltip is generated.
         Example Format of data:
         {
         key: "Date",
         value: "August 2009",
         series: [
         {key: "Series 1", value: "Value 1", color: "#000"},
         {key: "Series 2", value: "Value 2", color: "#00f"}
         ]
         }
         */
        var data = null;

        var gravity = 'w'   //Can be 'n','s','e','w'. Determines how tooltip is positioned.
            , distance = 50   //Distance to offset tooltip from the mouse location.
            , snapDistance = 25   //Tolerance allowed before tooltip is moved from its current position (creates 'snapping' effect)
            , fixedTop = null //If not null, this fixes the top position of the tooltip.
            , classes = null  //Attaches additional CSS classes to the tooltip DIV that is created.
            , chartContainer = null   //Parent DIV, of the SVG Container that holds the chart.
            , tooltipElem = null  //actual DOM element representing the tooltip.
            , position = {left: null, top: null}      //Relative position of the tooltip inside chartContainer.
            , enabled = true;  //True -> tooltips are rendered. False -> don't render tooltips.

        //Generates a unique id when you create a new tooltip() object
        var id = "nvtooltip-" + Math.floor(Math.random() * 100000);

        //CSS class to specify whether element should not have mouse events.
        var nvPointerEventsClass = "nv-pointer-events-none";

        //Format function for the tooltip values column
        var valueFormatter = function (d, i) {
            return d;
        };

        //Format function for the tooltip header value.
        var headerFormatter = function (d) {
            return d;
        };

        //By default, the tooltip model renders a beautiful table inside a DIV.
        //You can override this function if a custom tooltip is desired.
        var contentGenerator = function (d) {
            if (content != null) {
                return content;
            }

            if (d == null) {
                return '';
            }

            var table = d3.select(document.createElement("table"));
            var theadEnter = table.selectAll("thead")
                .data([d])
                .enter().append("thead");

            theadEnter.append("tr")
                .append("td")
                .attr("colspan", 3)
                .append("strong")
                .classed("x-value", true)
                .html(headerFormatter(d.value));

            var tbodyEnter = table.selectAll("tbody")
                .data([d])
                .enter().append("tbody");

            var trowEnter = tbodyEnter.selectAll("tr")
                .data(function (p) {
                    return p.series
                })
                .enter()
                .append("tr")
                .classed("highlight", function (p) {
                    return p.highlight
                });

            trowEnter.append("td")
                .classed("legend-color-guide", true)
                .append("div")
                .style("background-color", function (p) {
                    return p.color
                });

            trowEnter.append("td")
                .classed("key", true)
                .html(function (p) {
                    return p.key
                });

            trowEnter.append("td")
                .classed("value", true)
                .html(function (p, i) {
                    return valueFormatter(p.value, i)
                });


            trowEnter.selectAll("td").each(function (p) {
                if (p.highlight) {
                    var opacityScale = d3.scale.linear().domain([0, 1]).range(["#fff", p.color]);
                    var opacity = 0.6;
                    d3.select(this)
                        .style("border-bottom-color", opacityScale(opacity))
                        .style("border-top-color", opacityScale(opacity))
                    ;
                }
            });

            var html = table.node().outerHTML;
            if (d.footer !== undefined)
                html += "<div class='footer'>" + d.footer + "</div>";
            return html;

        };

        var dataSeriesExists = function (d) {
            if (d && d.series && d.series.length > 0) {
                return true;
            }
            return false;
        };

        //In situations where the chart is in a 'viewBox', re-position the tooltip based on how far chart is zoomed.
        function convertViewBoxRatio() {
            if (chartContainer) {
                var svg = d3.select(chartContainer);
                if (svg.node().tagName !== "svg") {
                    svg = svg.select("svg");
                }
                var viewBox = (svg.node()) ? svg.attr('viewBox') : null;
                if (viewBox) {
                    viewBox = viewBox.split(' ');
                    var ratio = parseInt(svg.style('width')) / viewBox[2];

                    position.left = position.left * ratio;
                    position.top = position.top * ratio;
                }
            }
        }

        //Creates new tooltip container, or uses existing one on DOM.
        function getTooltipContainer(newContent) {
            var body;
            if (chartContainer) {
                body = d3.select(chartContainer);
            } else {
                body = d3.select("body");
            }

            var container = body.select(".nvtooltip");
            if (container.node() === null) {
                //Create new tooltip div if it doesn't exist on DOM.
                container = body.append("div")
                    .attr("class", "nvtooltip " + (classes ? classes : "xy-tooltip"))
                    .attr("id", id)
                ;
            }

            container.node().innerHTML = newContent;
            container.style("top", 0).style("left", 0).style("opacity", 0);
            container.selectAll("div, table, td, tr").classed(nvPointerEventsClass, true)
            container.classed(nvPointerEventsClass, true);
            return container.node();
        }

        //Draw the tooltip onto the DOM.
        function nvtooltip() {
            if (!enabled) return;
            if (!dataSeriesExists(data)) return;

            convertViewBoxRatio();

            var left = position.left;
            var top = (fixedTop != null) ? fixedTop : position.top;
            var container = getTooltipContainer(contentGenerator(data));
            tooltipElem = container;
            if (chartContainer) {
                var svgComp = chartContainer.getElementsByTagName("svg")[0];
                var boundRect = (svgComp) ? svgComp.getBoundingClientRect() : chartContainer.getBoundingClientRect();
                var svgOffset = {left: 0, top: 0};
                if (svgComp) {
                    var svgBound = svgComp.getBoundingClientRect();
                    var chartBound = chartContainer.getBoundingClientRect();
                    var svgBoundTop = svgBound.top;

                    //Defensive code. Sometimes, svgBoundTop can be a really negative
                    //  number, like -134254. That's a bug.
                    //  If such a number is found, use zero instead. FireFox bug only
                    if (svgBoundTop < 0) {
                        var containerBound = chartContainer.getBoundingClientRect();
                        svgBoundTop = (Math.abs(svgBoundTop) > containerBound.height) ? 0 : svgBoundTop;
                    }
                    svgOffset.top = Math.abs(svgBoundTop - chartBound.top);
                    svgOffset.left = Math.abs(svgBound.left - chartBound.left);
                }
                //If the parent container is an overflow <div> with scrollbars, subtract the scroll offsets.
                //You need to also add any offset between the <svg> element and its containing <div>
                //Finally, add any offset of the containing <div> on the whole page.
                left += chartContainer.offsetLeft + svgOffset.left - 2 * chartContainer.scrollLeft;
                top += chartContainer.offsetTop + svgOffset.top - 2 * chartContainer.scrollTop;
            }

            if (snapDistance && snapDistance > 0) {
                top = Math.floor(top / snapDistance) * snapDistance;
            }

            nv.tooltip.calcTooltipPosition([left, top], gravity, distance, container);
            return nvtooltip;
        }

        nvtooltip.nvPointerEventsClass = nvPointerEventsClass;

        nvtooltip.content = function (_) {
            if (!arguments.length) return content;
            content = _;
            return nvtooltip;
        };

        //Returns tooltipElem...not able to set it.
        nvtooltip.tooltipElem = function () {
            return tooltipElem;
        };

        nvtooltip.contentGenerator = function (_) {
            if (!arguments.length) return contentGenerator;
            if (typeof _ === 'function') {
                contentGenerator = _;
            }
            return nvtooltip;
        };

        nvtooltip.data = function (_) {
            if (!arguments.length) return data;
            data = _;
            return nvtooltip;
        };

        nvtooltip.gravity = function (_) {
            if (!arguments.length) return gravity;
            gravity = _;
            return nvtooltip;
        };

        nvtooltip.distance = function (_) {
            if (!arguments.length) return distance;
            distance = _;
            return nvtooltip;
        };

        nvtooltip.snapDistance = function (_) {
            if (!arguments.length) return snapDistance;
            snapDistance = _;
            return nvtooltip;
        };

        nvtooltip.classes = function (_) {
            if (!arguments.length) return classes;
            classes = _;
            return nvtooltip;
        };

        nvtooltip.chartContainer = function (_) {
            if (!arguments.length) return chartContainer;
            chartContainer = _;
            return nvtooltip;
        };

        nvtooltip.position = function (_) {
            if (!arguments.length) return position;
            position.left = (typeof _.left !== 'undefined') ? _.left : position.left;
            position.top = (typeof _.top !== 'undefined') ? _.top : position.top;
            return nvtooltip;
        };

        nvtooltip.fixedTop = function (_) {
            if (!arguments.length) return fixedTop;
            fixedTop = _;
            return nvtooltip;
        };

        nvtooltip.enabled = function (_) {
            if (!arguments.length) return enabled;
            enabled = _;
            return nvtooltip;
        };

        nvtooltip.valueFormatter = function (_) {
            if (!arguments.length) return valueFormatter;
            if (typeof _ === 'function') {
                valueFormatter = _;
            }
            return nvtooltip;
        };

        nvtooltip.headerFormatter = function (_) {
            if (!arguments.length) return headerFormatter;
            if (typeof _ === 'function') {
                headerFormatter = _;
            }
            return nvtooltip;
        };

        //id() is a read-only function. You can't use it to set the id.
        nvtooltip.id = function () {
            return id;
        };

        return nvtooltip;
    };

    //Original tooltip.show function. Kept for backward compatibility.
    // pos = [left,top]
    nv.tooltip.show = function (pos, content, gravity, dist, parentContainer, classes) {

        //Create new tooltip div if it doesn't exist on DOM.
        var container = document.createElement('div');
        container.className = 'nvtooltip ' + (classes ? classes : 'xy-tooltip');

        var body = parentContainer;
        if (!parentContainer || parentContainer.tagName.match(/g|svg/i)) {
            //If the parent element is an SVG element, place tooltip in the <body> element.
            body = document.getElementsByTagName('body')[0];
        }

        container.style.left = 0;
        container.style.top = 0;
        container.style.opacity = 0;
        // Content can also be dom element
        if (typeof content !== 'string')
            container.appendChild(content);
        else
            container.innerHTML = content;
        body.appendChild(container);

        //If the parent container is an overflow <div> with scrollbars, subtract the scroll offsets.
        if (parentContainer) {
            pos[0] = pos[0] - parentContainer.scrollLeft;
            pos[1] = pos[1] - parentContainer.scrollTop;
        }
        nv.tooltip.calcTooltipPosition(pos, gravity, dist, container);
    };

    //Looks up the ancestry of a DOM element, and returns the first NON-svg node.
    nv.tooltip.findFirstNonSVGParent = function (Elem) {
        while (Elem.tagName.match(/^g|svg$/i) !== null) {
            Elem = Elem.parentNode;
        }
        return Elem;
    };

    //Finds the total offsetTop of a given DOM element.
    //Looks up the entire ancestry of an element, up to the first relatively positioned element.
    nv.tooltip.findTotalOffsetTop = function (Elem, initialTop) {
        var offsetTop = initialTop;

        do {
            if (!isNaN(Elem.offsetTop)) {
                offsetTop += (Elem.offsetTop);
            }
        } while (Elem = Elem.offsetParent);
        return offsetTop;
    };

    //Finds the total offsetLeft of a given DOM element.
    //Looks up the entire ancestry of an element, up to the first relatively positioned element.
    nv.tooltip.findTotalOffsetLeft = function (Elem, initialLeft) {
        var offsetLeft = initialLeft;

        do {
            if (!isNaN(Elem.offsetLeft)) {
                offsetLeft += (Elem.offsetLeft);
            }
        } while (Elem = Elem.offsetParent);
        return offsetLeft;
    };

    //Global utility function to render a tooltip on the DOM.
    //pos = [left,top] coordinates of where to place the tooltip, relative to the SVG chart container.
    //gravity = how to orient the tooltip
    //dist = how far away from the mouse to place tooltip
    //container = tooltip DIV
    nv.tooltip.calcTooltipPosition = function (pos, gravity, dist, container) {

        var height = parseInt(container.offsetHeight),
            width = parseInt(container.offsetWidth),
            windowWidth = nv.utils.windowSize().width,
            windowHeight = nv.utils.windowSize().height,
            scrollTop = window.pageYOffset,
            scrollLeft = window.pageXOffset,
            left, top;

        windowHeight = window.innerWidth >= document.body.scrollWidth ? windowHeight : windowHeight - 16;
        windowWidth = window.innerHeight >= document.body.scrollHeight ? windowWidth : windowWidth - 16;

        gravity = gravity || 's';
        dist = dist || 20;

        var tooltipTop = function (Elem) {
            return nv.tooltip.findTotalOffsetTop(Elem, top);
        };

        var tooltipLeft = function (Elem) {
            return nv.tooltip.findTotalOffsetLeft(Elem, left);
        };

        switch (gravity) {
            case 'e':
                left = pos[0] - width - dist;
                top = pos[1] - (height / 2);
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft < scrollLeft) left = pos[0] + dist > scrollLeft ? pos[0] + dist : scrollLeft - tLeft + left;
                if (tTop < scrollTop) top = scrollTop - tTop + top;
                if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                break;
            case 'w':
                left = pos[0] + dist;
                top = pos[1] - (height / 2);
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft + width > windowWidth) left = pos[0] - width - dist;
                if (tTop < scrollTop) top = scrollTop + 5;
                if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                break;
            case 'n':
                left = pos[0] - (width / 2) - 5;
                top = pos[1] + dist;
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft < scrollLeft) left = scrollLeft + 5;
                if (tLeft + width > windowWidth) left = left - width / 2 + 5;
                if (tTop + height > scrollTop + windowHeight) top = scrollTop + windowHeight - tTop + top - height;
                break;
            case 's':
                left = pos[0] - (width / 2);
                top = pos[1] - height - dist;
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                if (tLeft < scrollLeft) left = scrollLeft + 5;
                if (tLeft + width > windowWidth) left = left - width / 2 + 5;
                if (scrollTop > tTop) top = scrollTop;
                break;
            case 'none':
                left = pos[0];
                top = pos[1] - dist;
                var tLeft = tooltipLeft(container);
                var tTop = tooltipTop(container);
                break;
        }

        container.style.left = left + 'px';
        container.style.top = top + 'px';
        container.style.opacity = 1;
        container.style.position = 'absolute';

        return container;
    };

    //Global utility function to remove tooltips from the DOM.
    nv.tooltip.cleanup = function () {

        // Find the tooltips, mark them for removal by this class (so others cleanups won't find it)
        var tooltips = document.getElementsByClassName('nvtooltip');
        var purging = [];
        while (tooltips.length) {
            purging.push(tooltips[0]);
            tooltips[0].style.transitionDelay = '0 !important';
            tooltips[0].style.opacity = 0;
            tooltips[0].className = 'nvtooltip-pending-removal';
        }

        setTimeout(function () {

            while (purging.length) {
                var removeMe = purging.pop();
                removeMe.parentNode.removeChild(removeMe);
            }
        }, 500);
    };

})();


/*
 Gets the browser window size

 Returns object with height and width properties
 */
nv.utils.windowSize = function () {
    // Sane defaults
    var size = {width: 640, height: 480};

    // Earlier IE uses Doc.body
    if (document.body && document.body.offsetWidth) {
        size.width = document.body.offsetWidth;
        size.height = document.body.offsetHeight;
    }

    // IE can use depending on mode it is in
    if (document.compatMode == 'CSS1Compat' &&
        document.documentElement &&
        document.documentElement.offsetWidth) {

        size.width = document.documentElement.offsetWidth;
        size.height = document.documentElement.offsetHeight;
    }

    // Most recent browsers use
    if (window.innerWidth && window.innerHeight) {
        size.width = window.innerWidth;
        size.height = window.innerHeight;
    }
    return (size);
};


/*
 Binds callback function to run when window is resized
 */
nv.utils.windowResize = function (handler) {
    if (window.addEventListener) {
        window.addEventListener('resize', handler);
    } else {
        nv.log("ERROR: Failed to bind to window.resize with: ", handler);
    }
    // return object with clear function to remove the single added callback.
    return {
        callback: handler,
        clear: function () {
            window.removeEventListener('resize', handler);
        }
    }
};


/*
 Backwards compatible way to implement more d3-like coloring of graphs.
 If passed an array, wrap it in a function which implements the old behavior
 Else return what was passed in
 */
nv.utils.getColor = function (color) {
    //if you pass in nothing, get default colors back
    if (!arguments.length) {
        return nv.utils.defaultColor();

        //if passed an array, wrap it in a function
    } else if (color instanceof Array) {
        return function (d, i) {
            return d.color || color[i % color.length];
        };

        //if passed a function, return the function, or whatever it may be
        //external libs, such as angularjs-nvd3-directives use this
    } else {
        //can't really help it if someone passes rubbish as color
        return color;
    }
};


/*
 Default color chooser uses the index of an object as before.
 */
nv.utils.defaultColor = function () {
    var colors = d3.scale.category20().range();
    return function (d, i) {
        return d.color || colors[i % colors.length]
    };
};


/*
 Returns a color function that takes the result of 'getKey' for each series and
 looks for a corresponding color from the dictionary
 */
nv.utils.customTheme = function (dictionary, getKey, defaultColors) {
    // use default series.key if getKey is undefined
    getKey = getKey || function (series) {
        return series.key
    };
    defaultColors = defaultColors || d3.scale.category20().range();

    // start at end of default color list and walk back to index 0
    var defIndex = defaultColors.length;

    return function (series, index) {
        var key = getKey(series);
        if (typeof dictionary[key] === 'function') {
            return dictionary[key]();
        } else if (dictionary[key] !== undefined) {
            return dictionary[key];
        } else {
            // no match in dictionary, use a default color
            if (!defIndex) {
                // used all the default colors, start over
                defIndex = defaultColors.length;
            }
            defIndex = defIndex - 1;
            return defaultColors[defIndex];
        }
    };
};


/*
 From the PJAX example on d3js.org, while this is not really directly needed
 it's a very cool method for doing pjax, I may expand upon it a little bit,
 open to suggestions on anything that may be useful
 */
nv.utils.pjax = function (links, content) {

    var load = function (href) {
        d3.html(href, function (fragment) {
            var target = d3.select(content).node();
            target.parentNode.replaceChild(
                d3.select(fragment).select(content).node(),
                target);
            nv.utils.pjax(links, content);
        });
    };

    d3.selectAll(links).on("click", function () {
        history.pushState(this.href, this.textContent, this.href);
        load(this.href);
        d3.event.preventDefault();
    });

    d3.select(window).on("popstate", function () {
        if (d3.event.state) {
            load(d3.event.state);
        }
    });
};


/*
 For when we want to approximate the width in pixels for an SVG:text element.
 Most common instance is when the element is in a display:none; container.
 Forumla is : text.length * font-size * constant_factor
 */
nv.utils.calcApproxTextWidth = function (svgTextElem) {
    if (typeof svgTextElem.style === 'function'
        && typeof svgTextElem.text === 'function') {

        var fontSize = parseInt(svgTextElem.style("font-size").replace("px", ""));
        var textLength = svgTextElem.text().length;
        return textLength * fontSize * 0.5;
    }
    return 0;
};


/*
 Numbers that are undefined, null or NaN, convert them to zeros.
 */
nv.utils.NaNtoZero = function (n) {
    if (typeof n !== 'number'
        || isNaN(n)
        || n === null
        || n === Infinity
        || n === -Infinity) {

        return 0;
    }
    return n;
};

/*
 Add a way to watch for d3 transition ends to d3
 */
d3.selection.prototype.watchTransition = function (renderWatch) {
    var args = [this].concat([].slice.call(arguments, 1));
    return renderWatch.transition.apply(renderWatch, args);
};


/*
 Helper object to watch when d3 has rendered something
 */
nv.utils.renderWatch = function (dispatch, duration) {
    if (!(this instanceof nv.utils.renderWatch)) {
        return new nv.utils.renderWatch(dispatch, duration);
    }

    var _duration = duration !== undefined ? duration : 250;
    var renderStack = [];
    var self = this;

    this.models = function (models) {
        models = [].slice.call(arguments, 0);
        models.forEach(function (model) {
            model.__rendered = false;
            (function (m) {
                m.dispatch.on('renderEnd', function (arg) {
                    m.__rendered = true;
                    self.renderEnd('model');
                });
            })(model);

            if (renderStack.indexOf(model) < 0) {
                renderStack.push(model);
            }
        });
        return this;
    };

    this.reset = function (duration) {
        if (duration !== undefined) {
            _duration = duration;
        }
        renderStack = [];
    };

    this.transition = function (selection, args, duration) {
        args = arguments.length > 1 ? [].slice.call(arguments, 1) : [];

        if (args.length > 1) {
            duration = args.pop();
        } else {
            duration = _duration !== undefined ? _duration : 250;
        }
        selection.__rendered = false;

        if (renderStack.indexOf(selection) < 0) {
            renderStack.push(selection);
        }

        if (duration === 0) {
            selection.__rendered = true;
            selection.delay = function () {
                return this;
            };
            selection.duration = function () {
                return this;
            };
            return selection;
        } else {
            if (selection.length === 0) {
                selection.__rendered = true;
            } else if (selection.every(function (d) {
                    return !d.length;
                })) {
                selection.__rendered = true;
            } else {
                selection.__rendered = false;
            }

            var n = 0;
            return selection
                .transition()
                .duration(duration)
                .each(function () {
                    ++n;
                })
                .each('end', function (d, i) {
                    if (--n === 0) {
                        selection.__rendered = true;
                        self.renderEnd.apply(this, args);
                    }
                });
        }
    };

    this.renderEnd = function () {
        if (renderStack.every(function (d) {
                return d.__rendered;
            })) {
            renderStack.forEach(function (d) {
                d.__rendered = false;
            });
            dispatch.renderEnd.apply(this, arguments);
        }
    }

};


/*
 Takes multiple objects and combines them into the first one (dst)
 example:  nv.utils.deepExtend({a: 1}, {a: 2, b: 3}, {c: 4});
 gives:  {a: 2, b: 3, c: 4}
 */
nv.utils.deepExtend = function (dst) {
    var sources = arguments.length > 1 ? [].slice.call(arguments, 1) : [];
    sources.forEach(function (source) {
        for (key in source) {
            var isArray = dst[key] instanceof Array;
            var isObject = typeof dst[key] === 'object';
            var srcObj = typeof source[key] === 'object';

            if (isObject && !isArray && srcObj) {
                nv.utils.deepExtend(dst[key], source[key]);
            } else {
                dst[key] = source[key];
            }
        }
    });
};


/*
 state utility object, used to track d3 states in the models
 */
nv.utils.state = function () {
    if (!(this instanceof nv.utils.state)) {
        return new nv.utils.state();
    }
    var state = {};
    var _self = this;
    var _setState = function () {
    };
    var _getState = function () {
        return {};
    };
    var init = null;
    var changed = null;

    this.dispatch = d3.dispatch('change', 'set');

    this.dispatch.on('set', function (state) {
        _setState(state, true);
    });

    this.getter = function (fn) {
        _getState = fn;
        return this;
    };

    this.setter = function (fn, callback) {
        if (!callback) {
            callback = function () {
            };
        }
        _setState = function (state, update) {
            fn(state);
            if (update) {
                callback();
            }
        };
        return this;
    };

    this.init = function (state) {
        init = init || {};
        nv.utils.deepExtend(init, state);
    };

    var _set = function () {
        var settings = _getState();

        if (JSON.stringify(settings) === JSON.stringify(state)) {
            return false;
        }

        for (var key in settings) {
            if (state[key] === undefined) {
                state[key] = {};
            }
            state[key] = settings[key];
            changed = true;
        }
        return true;
    };

    this.update = function () {
        if (init) {
            _setState(init, false);
            init = null;
        }
        if (_set.call(this)) {
            this.dispatch.change(state);
        }
    };

};


/*
 Snippet of code you can insert into each nv.models.* to give you the ability to
 do things like:
 chart.options({
 showXAxis: true,
 tooltips: true
 });

 To enable in the chart:
 chart.options = nv.utils.optionsFunc.bind(chart);
 */
nv.utils.optionsFunc = function (args) {
    nv.deprecated('nv.utils.optionsFunc');
    if (args) {
        d3.map(args).forEach((function (key, value) {
            if (typeof this[key] === "function") {
                this[key](value);
            }
        }).bind(this));
    }
    return this;
};


/*
 numTicks:  requested number of ticks
 data:  the chart data

 returns the number of ticks to actually use on X axis, based on chart data
 to avoid duplicate ticks with the same value
 */
nv.utils.calcTicksX = function (numTicks, data) {
    // find max number of values from all data streams
    var numValues = 1;
    var i = 0;
    for (i; i < data.length; i += 1) {
        var stream_len = data[i] && data[i].values ? data[i].values.length : 0;
        numValues = stream_len > numValues ? stream_len : numValues;
    }
    nv.log("Requested number of ticks: ", numTicks);
    nv.log("Calculated max values to be: ", numValues);
    // make sure we don't have more ticks than values to avoid duplicates
    numTicks = numTicks > numValues ? numTicks = numValues - 1 : numTicks;
    // make sure we have at least one tick
    numTicks = numTicks < 1 ? 1 : numTicks;
    // make sure it's an integer
    numTicks = Math.floor(numTicks);
    nv.log("Calculating tick count as: ", numTicks);
    return numTicks;
};


/*
 returns number of ticks to actually use on Y axis, based on chart data
 */
nv.utils.calcTicksY = function (numTicks, data) {
    // currently uses the same logic but we can adjust here if needed later
    return nv.utils.calcTicksX(numTicks, data);
};


/*
 Add a particular option from an options object onto chart
 Options exposed on a chart are a getter/setter function that returns chart
 on set to mimic typical d3 option chaining, e.g. svg.option1('a').option2('b');

 option objects should be generated via Object.create() to provide
 the option of manipulating data via get/set functions.
 */
nv.utils.initOption = function (chart, name) {
    // if it's a call option, just call it directly, otherwise do get/set
    if (chart._calls && chart._calls[name]) {
        chart[name] = chart._calls[name];
    } else {
        chart[name] = function (_) {
            if (!arguments.length) return chart._options[name];
            chart._options[name] = _;
            return chart;
        };
    }
};


/*
 Add all options in an options object to the chart
 */
nv.utils.initOptions = function (chart) {
    var ops = Object.getOwnPropertyNames(chart._options || {});
    var calls = Object.getOwnPropertyNames(chart._calls || {});
    ops = ops.concat(calls);
    for (var i in ops) {
        nv.utils.initOption(chart, ops[i]);
    }
};


/*
 Inherit options from a D3 object
 d3.rebind makes calling the function on target actually call it on source
 Also use _d3options so we can track what we inherit for documentation and chained inheritance
 */
nv.utils.inheritOptionsD3 = function (target, d3_source, oplist) {
    target._d3options = oplist.concat(target._d3options || []);
    oplist.unshift(d3_source);
    oplist.unshift(target);
    d3.rebind.apply(this, oplist);
};


/*
 Remove duplicates from an array
 */
nv.utils.arrayUnique = function (a) {
    return a.sort().filter(function (item, pos) {
        return !pos || item != a[pos - 1];
    });
};


/*
 Keeps a list of custom symbols to draw from in addition to d3.svg.symbol
 Necessary since d3 doesn't let you extend its list -_-
 Add new symbols by doing nv.utils.symbols.set('name', function(size){...});
 */
nv.utils.symbolMap = d3.map();


/*
 Replaces d3.svg.symbol so that we can look both there and our own map
 */
nv.utils.symbol = function () {
    var type,
        size = 64;

    function symbol(d, i) {
        var t = type.call(this, d, i);
        var s = size.call(this, d, i);
        if (d3.svg.symbolTypes.indexOf(t) !== -1) {
            return d3.svg.symbol().type(t).size(s)();
        } else {
            return nv.utils.symbolMap.get(t)(s);
        }
    }

    symbol.type = function (_) {
        if (!arguments.length) return type;
        type = d3.functor(_);
        return symbol;
    };
    symbol.size = function (_) {
        if (!arguments.length) return size;
        size = d3.functor(_);
        return symbol;
    };
    return symbol;
};


/*
 Inherit option getter/setter functions from source to target
 d3.rebind makes calling the function on target actually call it on source
 Also track via _inherited and _d3options so we can track what we inherit
 for documentation generation purposes and chained inheritance
 */
nv.utils.inheritOptions = function (target, source) {
    // inherit all the things
    var ops = Object.getOwnPropertyNames(source._options || {});
    var calls = Object.getOwnPropertyNames(source._calls || {});
    var inherited = source._inherited || [];
    var d3ops = source._d3options || [];
    var args = ops.concat(calls).concat(inherited).concat(d3ops);
    args.unshift(source);
    args.unshift(target);
    d3.rebind.apply(this, args);
    // pass along the lists to keep track of them, don't allow duplicates
    target._inherited = nv.utils.arrayUnique(ops.concat(calls).concat(inherited).concat(ops).concat(target._inherited || []));
    target._d3options = nv.utils.arrayUnique(d3ops.concat(target._d3options || []));
};


/*
 Runs common initialize code on the svg before the chart builds
 */
nv.utils.initSVG = function (svg) {
    svg.classed({'nvd3-svg': true});
};

nv.models.legend = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 5, right: 0, bottom: 5, left: 0}
        , width = 400
        , height = 20
        , getKey = function (d) {
            return d.key
        }
        , color = nv.utils.defaultColor()
        , align = true
        , rightAlign = false
        , updateState = true   //If true, legend will update data.disabled and trigger a 'stateChange' dispatch.
        , radioButtonMode = false   //If true, clicking legend items will cause it to behave like a radio button. (only one can be selected at a time)
        , dispatch = d3.dispatch('legendClick', 'legendDblclick', 'legendMouseover', 'legendMouseout', 'stateChange')
        ;

    function chart(selection) {
        selection.each(function (data) {
            var availableWidth = width - margin.left - margin.right,
                container = d3.select(this);
            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-legend').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-legend').append('g');
            var g = wrap.select('g');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var series = g.selectAll('.nv-series')
                .data(function (d) {
                    return d
                });
            var seriesEnter = series.enter().append('g').attr('class', 'nv-series')
                .on('mouseover', function (d, i) {
                    dispatch.legendMouseover(d, i);  //TODO: Make consistent with other event objects
                })
                .on('mouseout', function (d, i) {
                    dispatch.legendMouseout(d, i);
                })
                .on('click', function (d, i) {
                    dispatch.legendClick(d, i);
                    if (updateState) {
                        if (radioButtonMode) {
                            //Radio button mode: set every series to disabled,
                            //  and enable the clicked series.
                            data.forEach(function (series) {
                                series.disabled = true
                            });
                            d.disabled = false;
                        }
                        else {
                            d.disabled = !d.disabled;
                            if (data.every(function (series) {
                                    return series.disabled
                                })) {
                                //the default behavior of NVD3 legends is, if every single series
                                // is disabled, turn all series' back on.
                                data.forEach(function (series) {
                                    series.disabled = false
                                });
                            }
                        }
                        dispatch.stateChange({
                            disabled: data.map(function (d) {
                                return !!d.disabled
                            })
                        });
                    }
                })
                .on('dblclick', function (d, i) {
                    dispatch.legendDblclick(d, i);
                    if (updateState) {
                        //the default behavior of NVD3 legends, when double clicking one,
                        // is to set all other series' to false, and make the double clicked series enabled.
                        data.forEach(function (series) {
                            series.disabled = true;
                        });
                        d.disabled = false;
                        dispatch.stateChange({
                            disabled: data.map(function (d) {
                                return !!d.disabled
                            })
                        });
                    }
                });
            seriesEnter.append('circle')
                .style('stroke-width', 2)
                .attr('class', 'nv-legend-symbol')
                .attr('r', 5);
            seriesEnter.append('text')
                .attr('text-anchor', 'start')
                .attr('class', 'nv-legend-text')
                .attr('dy', '.32em')
                .attr('dx', '8');
            series.classed('nv-disabled', function (d) {
                return d.disabled
            });
            series.exit().remove();
            series.select('circle')
                .style('fill', function (d, i) {
                    return d.color || color(d, i)
                })
                .style('stroke', function (d, i) {
                    return d.color || color(d, i)
                });
            series.select('text').text(getKey);

            //TODO: implement fixed-width and max-width options (max-width is especially useful with the align option)
            // NEW ALIGNING CODE, TODO: clean up
            if (align) {

                var seriesWidths = [];
                series.each(function (d, i) {
                    var legendText = d3.select(this).select('text');
                    var nodeTextLength;
                    try {
                        nodeTextLength = legendText.node().getComputedTextLength();
                        // If the legendText is display:none'd (nodeTextLength == 0), simulate an error so we approximate, instead
                        if (nodeTextLength <= 0) throw Error();
                    }
                    catch (e) {
                        nodeTextLength = nv.utils.calcApproxTextWidth(legendText);
                    }

                    seriesWidths.push(nodeTextLength + 28); // 28 is ~ the width of the circle plus some padding
                });

                var seriesPerRow = 0;
                var legendWidth = 0;
                var columnWidths = [];

                while (legendWidth < availableWidth && seriesPerRow < seriesWidths.length) {
                    columnWidths[seriesPerRow] = seriesWidths[seriesPerRow];
                    legendWidth += seriesWidths[seriesPerRow++];
                }
                if (seriesPerRow === 0) seriesPerRow = 1; //minimum of one series per row

                while (legendWidth > availableWidth && seriesPerRow > 1) {
                    columnWidths = [];
                    seriesPerRow--;

                    for (var k = 0; k < seriesWidths.length; k++) {
                        if (seriesWidths[k] > (columnWidths[k % seriesPerRow] || 0))
                            columnWidths[k % seriesPerRow] = seriesWidths[k];
                    }

                    legendWidth = columnWidths.reduce(function (prev, cur, index, array) {
                        return prev + cur;
                    });
                }

                var xPositions = [];
                for (var i = 0, curX = 0; i < seriesPerRow; i++) {
                    xPositions[i] = curX;
                    curX += columnWidths[i];
                }

                series
                    .attr('transform', function (d, i) {
                        return 'translate(' + xPositions[i % seriesPerRow] + ',' + (5 + Math.floor(i / seriesPerRow) * 20) + ')';
                    });

                //position legend as far right as possible within the total width
                if (rightAlign) {
                    g.attr('transform', 'translate(' + (width - margin.right - legendWidth) + ',' + margin.top + ')');
                }
                else {
                    g.attr('transform', 'translate(0' + ',' + margin.top + ')');
                }

                height = margin.top + margin.bottom + (Math.ceil(seriesWidths.length / seriesPerRow) * 20);

            } else {

                var ypos = 5,
                    newxpos = 5,
                    maxwidth = 0,
                    xpos;
                series
                    .attr('transform', function (d, i) {
                        var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
                        xpos = newxpos;

                        if (width < margin.left + margin.right + xpos + length) {
                            newxpos = xpos = 5;
                            ypos += 20;
                        }

                        newxpos += length;
                        if (newxpos > maxwidth) maxwidth = newxpos;

                        return 'translate(' + xpos + ',' + ypos + ')';
                    });

                //position legend as far right as possible within the total width
                g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

                height = margin.top + margin.bottom + ypos + 15;
            }
        });

        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width: {
            get: function () {
                return width;
            }, set: function (_) {
                width = _;
            }
        },
        height: {
            get: function () {
                return height;
            }, set: function (_) {
                height = _;
            }
        },
        key: {
            get: function () {
                return getKey;
            }, set: function (_) {
                getKey = _;
            }
        },
        align: {
            get: function () {
                return align;
            }, set: function (_) {
                align = _;
            }
        },
        rightAlign: {
            get: function () {
                return rightAlign;
            }, set: function (_) {
                rightAlign = _;
            }
        },
        updateState: {
            get: function () {
                return updateState;
            }, set: function (_) {
                updateState = _;
            }
        },
        radioButtonMode: {
            get: function () {
                return radioButtonMode;
            }, set: function (_) {
                radioButtonMode = _;
            }
        },

        // options that require extra logic in the setter
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = _.top !== undefined ? _.top : margin.top;
                margin.right = _.right !== undefined ? _.right : margin.right;
                margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
                margin.left = _.left !== undefined ? _.left : margin.left;
            }
        },
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = nv.utils.getColor(_);
            }
        }
    });

    nv.utils.initOptions(chart);

    return chart;
};

nv.models.pie = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 500
        , height = 500
        , getX = function (d) {
            return d.x
        }
        , getY = function (d) {
            return d.y
        }
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , color = nv.utils.defaultColor()
        , valueFormat = d3.format(',.0f')
        , labelFormat = d3.format('%')
        , showLabels = true
        , pieLabelsOutside = true
        , donutLabelsOutside = false
        , labelType = "key"
        , labelThreshold = .02 //if slice percentage is under this, don't show label
        , donut = false
        , title = false
        , growOnHover = true
        , titleOffset = 0
        , labelSunbeamLayout = false
        , startAngle = false
        , padAngle = false
        , endAngle = false
        , cornerRadius = 0
        , donutRatio = 0.5
        , duration = 250
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'renderEnd')
        ;


    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function (data) {
            var availableWidth = width - margin.left - margin.right
                , availableHeight = height - margin.top - margin.bottom
                , radius = Math.min(availableWidth, availableHeight) / 2
                , arcRadius = radius - (radius / 5)
                , container = d3.select(this)
                ;
            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-pie').data(data);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-pie nv-chart-' + id);
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');
            var g_pie = gEnter.append('g').attr('class', 'nv-pie');
            gEnter.append('g').attr('class', 'nv-pieLabels');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            g.select('.nv-pie').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');
            g.select('.nv-pieLabels').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            //
            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });


            var arc = d3.svg.arc().outerRadius(arcRadius);
            var arcOver = d3.svg.arc().outerRadius(arcRadius + 5);

            if (startAngle) {
                arc.startAngle(startAngle);
                arcOver.startAngle(startAngle);
            }
            if (endAngle) {
                arc.endAngle(endAngle);
                arcOver.endAngle(endAngle);
            }
            if (donut) {
                arc.innerRadius(radius * donutRatio);
                arcOver.innerRadius(radius * donutRatio);
            }

            // Setup the Pie chart and choose the data element
            var pie = d3.layout.pie()
                .sort(null)
                .value(function (d) {
                    return d.disabled ? 0 : getY(d)
                });

            // padAngle added in d3 3.5
            if (pie.padAngle && padAngle) {
                pie.padAngle(padAngle);
            }

            if (arc.cornerRadius && cornerRadius) {
                arc.cornerRadius(cornerRadius);
                arcOver.cornerRadius(cornerRadius);
            }

            // if title is specified and donut, put it in the middle
            if (donut && title) {
                var title_g = g_pie.append('g').attr('class', 'nv-pie');

                title_g.append("text")
                    .style("text-anchor", "middle")
                    .attr('class', 'nv-pie-title')
                    .text(function (d) {
                        return title;
                    })
                    .attr("dy", "0.35em") // trick to vertically center text
                    .attr('transform', function (d, i) {
                        return 'translate(0, ' + titleOffset + ')';
                    });
            }

            var slices = wrap.select('.nv-pie').selectAll('.nv-slice').data(pie);
            var pieLabels = wrap.select('.nv-pieLabels').selectAll('.nv-label').data(pie);

            slices.exit().remove();
            pieLabels.exit().remove();

            var ae = slices.enter().append('g')
            ae.attr('class', 'nv-slice')
            ae.on('mouseover', function (d, i) {
                d3.select(this).classed('hover', true);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(70)
                        .attr("d", arcOver);
                }
                dispatch.elementMouseover({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    pointIndex: i,
                    pos: [d3.event.pageX, d3.event.pageY],
                    id: id,
                    color: d3.select(this).style("fill")
                });
            });
            ae.on('mouseout', function (d, i) {
                d3.select(this).classed('hover', false);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(50)
                        .attr("d", arc);
                }
                dispatch.elementMouseout({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    id: id
                });
            });

            slices.attr('fill', function (d, i) {
                return color(d, i);
            })
            slices.attr('stroke', function (d, i) {
                return color(d, i);
            });

            var paths = ae.append('path').each(function (d) {
                this._current = d;
            });

            paths.on('click', function (d, i) {
                dispatch.elementClick({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                d3.event.stopPropagation();
            });
            paths.on('dblclick', function (d, i) {
                dispatch.elementDblClick({
                    label: getX(d.data),
                    value: getY(d.data),
                    point: d.data,
                    index: i,
                    pos: d3.event,
                    id: id
                });
                d3.event.stopPropagation();
            });
            slices.select('path')
                .transition()
                .attr('d', arc)
                .attrTween('d', arcTween);

            if (showLabels) {
                // This does the normal label
                var labelsArc = d3.svg.arc().innerRadius(0);

                if (pieLabelsOutside) {
                    var labelsArc = arc;
                }

                if (donutLabelsOutside) {
                    labelsArc = d3.svg.arc().outerRadius(arc.outerRadius());
                }

                pieLabels.enter().append("g").classed("nv-label", true).each(function (d, i) {
                    var group = d3.select(this);

                    group.attr('transform', function (d) {
                        if (labelSunbeamLayout) {
                            d.outerRadius = arcRadius + 10; // Set Outer Coordinate
                            d.innerRadius = arcRadius + 15; // Set Inner Coordinate
                            var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                            if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
                                rotateAngle -= 90;
                            } else {
                                rotateAngle += 90;
                            }
                            return 'translate(' + labelsArc.centroid(d) + ') rotate(' + rotateAngle + ')';
                        } else {
                            d.outerRadius = radius + 10; // Set Outer Coordinate
                            d.innerRadius = radius + 15; // Set Inner Coordinate
                            return 'translate(' + labelsArc.centroid(d) + ')'
                        }
                    });

                    group.append('rect')
                        .style('stroke', '#fff')
                        .style('fill', '#fff')
                        .attr("rx", 3)
                        .attr("ry", 3);

                    group.append('text')
                        .style('text-anchor', labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle') //center the text on it's origin or begin/end if orthogonal aligned
                        .style('fill', '#fff') // ikirmitz: changed this to white

                });

                var labelLocationHash = {};
                var avgHeight = 14;
                var avgWidth = 140;
                var createHashKey = function (coordinates) {
                    return Math.floor(coordinates[0] / avgWidth) * avgWidth + ',' + Math.floor(coordinates[1] / avgHeight) * avgHeight;
                };

                pieLabels.watchTransition(renderWatch, 'pie labels').attr('transform', function (d) {
                    if (labelSunbeamLayout) {
                        d.outerRadius = arcRadius + 10; // Set Outer Coordinate
                        d.innerRadius = arcRadius + 15; // Set Inner Coordinate
                        var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                        if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
                            rotateAngle -= 90;
                        } else {
                            rotateAngle += 90;
                        }
                        return 'translate(' + labelsArc.centroid(d) + ') rotate(' + rotateAngle + ')';
                    } else {
                        d.outerRadius = radius + 10; // Set Outer Coordinate
                        d.innerRadius = radius + 15; // Set Inner Coordinate

                        /*
                         Overlapping pie labels are not good. What this attempts to do is, prevent overlapping.
                         Each label location is hashed, and if a hash collision occurs, we assume an overlap.
                         Adjust the label's y-position to remove the overlap.
                         */
                        var center = labelsArc.centroid(d);
                        if (d.value) {
                            var hashKey = createHashKey(center);
                            if (labelLocationHash[hashKey]) {
                                center[1] -= avgHeight;
                            }
                            labelLocationHash[createHashKey(center)] = true;
                        }
                        return 'translate(' + center + ')'
                    }
                });

                pieLabels.select(".nv-label text")
                    .style('text-anchor', labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle') //center the text on it's origin or begin/end if orthogonal aligned
                    .text(function (d, i) {
                        var percent = (d.endAngle - d.startAngle) / (2 * Math.PI);
                        var labelTypes = {
                            "key": getX(d.data),
                            "value": getY(d.data),
                            "percent": labelFormat(percent)
                        };
                        return (d.value && percent > labelThreshold) ? labelTypes[labelType] : '';
                    })
                ;
            }


            // Computes the angle of an arc, converting from radians to degrees.
            function angle(d) {
                var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
                return a > 90 ? a - 180 : a;
            }

            function arcTween(a) {
                a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
                a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
                if (!donut) a.innerRadius = 0;
                var i = d3.interpolate(this._current, a);
                this._current = i(0);
                return function (t) {
                    return arc(i(t));
                };
            }
        });

        renderWatch.renderEnd('pie immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width: {
            get: function () {
                return width;
            }, set: function (_) {
                width = _;
            }
        },
        height: {
            get: function () {
                return height;
            }, set: function (_) {
                height = _;
            }
        },
        showLabels: {
            get: function () {
                return showLabels;
            }, set: function (_) {
                showLabels = _;
            }
        },
        title: {
            get: function () {
                return title;
            }, set: function (_) {
                title = _;
            }
        },
        titleOffset: {
            get: function () {
                return titleOffset;
            }, set: function (_) {
                titleOffset = _;
            }
        },
        labelThreshold: {
            get: function () {
                return labelThreshold;
            }, set: function (_) {
                labelThreshold = _;
            }
        },
        labelFormat: {
            get: function () {
                return labelFormat;
            }, set: function (_) {
                labelFormat = _;
            }
        },
        valueFormat: {
            get: function () {
                return valueFormat;
            }, set: function (_) {
                valueFormat = _;
            }
        },
        x: {
            get: function () {
                return getX;
            }, set: function (_) {
                getX = _;
            }
        },
        id: {
            get: function () {
                return id;
            }, set: function (_) {
                id = _;
            }
        },
        endAngle: {
            get: function () {
                return endAngle;
            }, set: function (_) {
                endAngle = _;
            }
        },
        startAngle: {
            get: function () {
                return startAngle;
            }, set: function (_) {
                startAngle = _;
            }
        },
        padAngle: {
            get: function () {
                return padAngle;
            }, set: function (_) {
                padAngle = _;
            }
        },
        cornerRadius: {
            get: function () {
                return cornerRadius;
            }, set: function (_) {
                cornerRadius = _;
            }
        },
        donutRatio: {
            get: function () {
                return donutRatio;
            }, set: function (_) {
                donutRatio = _;
            }
        },
        pieLabelsOutside: {
            get: function () {
                return pieLabelsOutside;
            }, set: function (_) {
                pieLabelsOutside = _;
            }
        },
        donutLabelsOutside: {
            get: function () {
                return donutLabelsOutside;
            }, set: function (_) {
                donutLabelsOutside = _;
            }
        },
        labelSunbeamLayout: {
            get: function () {
                return labelSunbeamLayout;
            }, set: function (_) {
                labelSunbeamLayout = _;
            }
        },
        donut: {
            get: function () {
                return donut;
            }, set: function (_) {
                donut = _;
            }
        },
        growOnHover: {
            get: function () {
                return growOnHover;
            }, set: function (_) {
                growOnHover = _;
            }
        },

        // options that require extra logic in the setter
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
                margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
                margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
                margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
            }
        },
        y: {
            get: function () {
                return getY;
            }, set: function (_) {
                getY = d3.functor(_);
            }
        },
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = nv.utils.getColor(_);
            }
        },
        labelType: {
            get: function () {
                return labelType;
            }, set: function (_) {
                labelType = _ || 'key';
            }
        }
    });

    nv.utils.initOptions(chart);
    return chart;
};

nv.models.pieChart = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var pie = nv.models.pie();
    var legend = nv.models.legend();

    var margin = {top: 0, right: 20, bottom: 20, left: 20}
        , width = null
        , height = null
        , showLegend = true
        , rightAlign = false
        , color = nv.utils.defaultColor()
        , tooltips = true
        , tooltip = function (key, y, e, graph) {
            return '<h3 style="background-color: '
                + e.color + '"><font color="white">' + key + '</font></h3>'
                + '<p>' + y + '</p>';
        }
        , state = nv.utils.state()
        , defaultState = null
        , noData = "No Data Available."
        , duration = 250
        , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'stateChange', 'changeState', 'renderEnd')
        ;

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var showTooltip = function (e, offsetElement) {
        var tooltipLabel = pie.x()(e.point);
        var left = e.pos[0] + ( (offsetElement && offsetElement.offsetLeft) || 0 ),
            top = e.pos[1] + ( (offsetElement && offsetElement.offsetTop) || 0),
            y = pie.valueFormat()(pie.y()(e.point)),
            content = tooltip(tooltipLabel, y, e, chart)
            ;
        nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
    };

    var renderWatch = nv.utils.renderWatch(dispatch);

    var stateGetter = function (data) {
        return function () {
            return {
                active: data.map(function (d) {
                    return !d.disabled
                })
            };
        }
    };

    var stateSetter = function (data) {
        return function (state) {
            if (state.active !== undefined) {
                data.forEach(function (series, i) {
                    series.disabled = !state.active[i];
                });
            }
        }
    };

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(pie);

        selection.each(function (data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var that = this;
            var availableWidth = (width || parseInt(container.style('width'), 10) || 960)
                    - margin.left - margin.right,
                availableHeight = (height || parseInt(container.style('height'), 10) || 400)
                    - margin.top - margin.bottom
                ;

            chart.update = function () {
                container.transition().call(chart);
            };
            chart.container = this;

            state.setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            //set state.disabled
            state.disabled = data.map(function (d) {
                return !!d.disabled
            });

            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }

            // Display No Data message if there's nothing to show.
            if (!data || !data.length) {
                var noDataText = container.selectAll('.nv-noData').data([noData]);

                noDataText.enter().append('text')
                    .attr('class', 'nvd3 nv-noData')
                    .attr('dy', '-.7em')
                    .style('text-anchor', 'middle');

                noDataText
                    .attr('x', margin.left + availableWidth / 2)
                    .attr('y', margin.top + availableHeight / 2)
                    .text(function (d) {
                        return d
                    });

                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-pieChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-pieChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-pieWrap');
            gEnter.append('g').attr('class', 'nv-legendWrap');

            // Legend
            if (showLegend) {
                legend.width(availableWidth).key(pie.x());

                wrap.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if (margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight = (height || parseInt(container.style('height')) || 400)
                    - margin.top - margin.bottom;
                }

                wrap.select('.nv-legendWrap')
                    .attr('transform', 'translate(0,' + (-margin.top) + ')');
            }

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Main Chart Component(s)
            pie.width(availableWidth).height(availableHeight);
            var pieWrap = g.select('.nv-pieWrap').datum([data]);
            d3.transition(pieWrap).call(pie);

            // Event Handling/Dispatching (in chart's scope)
            legend.dispatch.on('stateChange', function (newState) {
                for (var key in newState) {
                    state[key] = newState[key];
                }
                dispatch.stateChange(state);
                chart.update();
            });

            pie.dispatch.on('elementMouseout.tooltip', function (e) {
                dispatch.tooltipHide(e);
            });

            // Update chart from a state object passed to event handler
            dispatch.on('changeState', function (e) {
                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function (series, i) {
                        series.disabled = e.disabled[i];
                    });
                    state.disabled = e.disabled;
                }
                chart.update();
            });

        });

        renderWatch.renderEnd('pieChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    pie.dispatch.on('elementMouseover.tooltip', function (e) {
        e.pos = [e.pos[0] + margin.left, e.pos[1] + margin.top];
        dispatch.tooltipShow(e);
    });

    dispatch.on('tooltipShow', function (e) {
        if (tooltips) showTooltip(e);
    });

    dispatch.on('tooltipHide', function () {
        if (tooltips) nv.tooltip.cleanup();
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.legend = legend;
    chart.dispatch = dispatch;
    chart.pie = pie;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // use Object get/set functionality to map between vars and chart functions
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        noData: {
            get: function () {
                return noData;
            }, set: function (_) {
                noData = _;
            }
        },
        tooltipContent: {
            get: function () {
                return tooltip;
            }, set: function (_) {
                tooltip = _;
            }
        },
        tooltips: {
            get: function () {
                return tooltips;
            }, set: function (_) {
                tooltips = _;
            }
        },
        showLegend: {
            get: function () {
                return showLegend;
            }, set: function (_) {
                showLegend = _;
            }
        },
        defaultState: {
            get: function () {
                return defaultState;
            }, set: function (_) {
                defaultState = _;
            }
        },
        // options that require extra logic in the setter
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = _;
                legend.color(color);
                pie.color(color);
            }
        },
        duration: {
            get: function () {
                return duration;
            }, set: function (_) {
                duration = _;
                renderWatch.reset(duration);
            }
        }
    });
    nv.utils.inheritOptions(chart, pie);
    nv.utils.initOptions(chart);
    return chart;
};
