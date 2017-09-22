L.Control.MapLegend = L.Control.extend({
    options: {
        position: 'bottomright',
        numberOfColors: 20,  // still not using this :(
        summarizeBy: 'Species',
        sortBy: 'Color',
        lum: 0.7,
        trafficlight: {
            colorBrewer: L.ColorBrewer.Diverging.RdYlBu[10].slice()
        },
        palette: {}
    },

    // add the legend to the DOM tree
    addLegendIcon: function () {
        this._legendDiv = L.DomUtil.create('div', 'info legend active');
        legendDiv = this._legendDiv;

        L.easyButton('fa-info',
            function () {
                if (L.DomUtil.hasClass(legendDiv, "active")) {
                    legend.remove();
                    L.DomUtil.removeClass(legendDiv, "active");
                } else {
                    legend.addTo(map);
                    L.DomUtil.addClass(legendDiv, "active");
                }

            },
            'Toggle legend ON of OFF'
        );

    },

    bindTableFilter: function () {
        // filter terms in the table legend
        $('#Filter-Terms').keyup(function () {
            var val = $.trim($(this).val()).replace(/ +/g, ' ').toLowerCase();

            $('.table-legend-term').show().filter(function () {
                var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
                return !~text.indexOf(val);
            }).hide();
        });

    },

    markerColor: function (value) {
        var options = this.options;
        var fillColor, textColor;

        if (value < 0) {
            return ["white", '#555'];
        }

        fillColor = options.trafficlight.scale.evaluate(value);
        textColor = getContrastYIQ(fillColor);
        return [fillColor, textColor];


    },

    /*
     function generatePalette
     date: 17/03/2015
     purpose:
     inputs: {items} a list of items to be associated with colors,
     {mColors} the number of maximum colors in the palette
     {paletteType} 1 for Kelly's 2 for Boytons'
     outputs: an associative array with items names as the keys and color as the values
     */
    generatePalette: function (items) {
        var options = this.options;
        var newPalette = {};
        var limitedPalette = {};

        // from http://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors
        var kelly_colors_hex = [
            "#FFB300", // Vivid Yellow
            "#803E75", // Strong Purple
            "#FF6800", // Vivid Orange
            "#A6BDD7", // Very Light Blue
            "#C10020", // Vivid Red
            "#CEA262", // Grayish Yellow
            // "#817066", // Medium Gray

            // The following don't work well for people with defective color vision
            "#007D34", // Vivid Green
            "#F6768E", // Strong Purplish Pink
            "#00538A", // Strong Blue
            "#FF7A5C", // Strong Yellowish Pink
            "#53377A", // Strong Violet
            "#FF8E00", // Vivid Orange Yellow
            "#B32851", // Strong Purplish Red
            "#F4C800", // Vivid Greenish Yellow
            "#7F180D", // Strong Reddish Brown
            "#93AA00", // Vivid Yellowish Green
            "#593315", // Deep Yellowish Brown
            "#F13A13", // Vivid Reddish Orange
            "#232C16" // Dark Olive Green
        ];

        // from http://alumni.media.mit.edu/~wad/color/palette.html
        var boytons_colors_hex = [
            "#000000", // Black
            "#575757", // Dark Gray
            "#A0A0A0", // Light Gray
            "#FFFFFF", // White
            "#2A4BD7", // Blue
            "#1D6914", // Green
            "#814A19", // Brown
            "#8126C0", // Purple
            "#9DAFFF", // Light Purple
            "#81C57A", // Light Green
            "#E9DEBB", // Cream
            "#AD2323", // Red
            "#29D0D0", // Teal
            "#FFEE33", // Yellow
            "#FF9233", // Orange
            "#FFCDF3"  // Pink
        ];

        var numItems = items.length,
            stNumItems = numItems, // store the number of items
            hasNoData = false;


        for (var i = 0; i < stNumItems; i++) {
            // if (typeof items[i] === 'object') {
            if (i === options.numberOfColors) break;
            var item = items[i][0];

            // is this 'no data'? Make sure is black. Also temporarily remove from the array and add it last after
            // grayscale colours have been assigned
            if (item === 'no data') {
                hasNoData = true;
                continue;
            }

            newPalette[item] = kelly_colors_hex[i];
            numItems--; // track how many items need a grayscale color

        }

        if (hasNoData) {
            newPalette['no data'] = "#000000";
            numItems--;
        }

        var lumInterval = 0.5 / numItems;
        this.lum = 0.7;
        for (var c = 0; c < numItems; c++) {
            var element = stNumItems - numItems + c;
            var item = items[element][0];
            newPalette[item] = this._colorLuminance("#FFFFFF", -this.lum);
            this.lum -= lumInterval;

        }


        return newPalette;
    },

    // Get a simple associative array (key-value) and sort it by value
    _sortHashByValue: function (hash) {
        var tupleArray = [];
        for (var key in hash) if (hash.hasOwnProperty(key)) tupleArray.push([key, hash[key]]);
        tupleArray.sort(function (a, b) {
            return b[1] - a[1]
        });
        return tupleArray;
    },

    // taken from http://jsfiddle.net/shanfan/ojgp5718/

    _Color: function (hexVal) { //define a Color class for the color objects
        this.hex = hexVal;
    },

    _constructColor: function (colorObj) {
        var hex = colorObj.hex.substring(1);
        /* Get the RGB values to calculate the Hue. */
        var r = parseInt(hex.substring(0, 2), 16) / 255;
        var g = parseInt(hex.substring(2, 4), 16) / 255;
        var b = parseInt(hex.substring(4, 6), 16) / 255;

        /* Getting the Max and Min values for Chroma. */
        var max = Math.max.apply(Math, [r, g, b]);
        var min = Math.min.apply(Math, [r, g, b]);

        /* Variables for HSV value of hex color. */
        var chr = max - min;
        var hue = 0;
        var val = max;
        var sat = 0;

        if (val > 0) {
            /* Calculate Saturation only if Value isn't 0. */
            sat = chr / val;
            if (sat > 0) {
                if (r == max) {
                    hue = 60 * (((g - min) - (b - min)) / chr);
                    if (hue < 0) {
                        hue += 360;
                    }
                } else if (g == max) {
                    hue = 120 + 60 * (((b - min) - (r - min)) / chr);
                } else if (b == max) {
                    hue = 240 + 60 * (((r - min) - (g - min)) / chr);
                }
            }
        }
        colorObj.chroma = chr;
        colorObj.hue = hue;
        colorObj.sat = sat;
        colorObj.val = val;
        colorObj.luma = 0.3 * r + 0.59 * g + 0.11 * b;
        colorObj.red = parseInt(hex.substring(0, 2), 16);
        colorObj.green = parseInt(hex.substring(2, 4), 16);
        colorObj.blue = parseInt(hex.substring(4, 6), 16);
        return colorObj;
    },

    _sortColorsByHue: function (colors) {
        var tuples = [];
        var sortedPalette = {};
        for (var colorsKey in colors) if (colors.hasOwnProperty(colorsKey)) {
            tuples.push([colorsKey, colors[colorsKey]])
        }

        tuples.sort(function (a, b) {
            a = a[1];
            b = b[1];

            return b.hue - a.hue;
        });

        for (var i = 0; i < tuples.length; i++) {
            var key = tuples[i][0];
            var value = tuples[i][1];
            sortedPalette[key] = value.hex;  // keep only the hex value
        }

        return sortedPalette;
    },


    /*
     function _colorLuminance
     date: 20/03/2015
     purpose: extracts the red, green and blue values in turn, converts them to decimal, applies the luminosity factor,
     and converts them back to hexadecimal.
     inputs: <hex> original hex color value <lum> level of luminosity from 0 (lightest) to 1 (darkest)
     outputs: a hex represantation of the color
     source: http://www.sitepoint.com/javascript-generate-lighter-darker-color/
     */

    _colorLuminance: function (hex, lum) {


        // validate hex string
        "use strict";

        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;

        // convert to decimal and change luminosity
        var rgb = "#", c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }

        return rgb;
    },

    // Sort palette items by name
    _outputNames: function (hexArray, numOfColors) {
        var names = [];
        var cntLegend = 1,
            hasNoData = false;

        for (var paletteKey in hexArray) if (hexArray.hasOwnProperty(paletteKey)) {
            if (paletteKey === 'no data') {
                hasNoData = true;
                continue;
            }

            if (numOfColors > 0 && cntLegend === numOfColors) break;
            var hexcolor = hexArray[paletteKey];
            names.push({name: paletteKey, color: hexcolor});
            cntLegend++;
        }

        var sortedNames = _.sortBy(names, function (item) {
            return item.name.toLowerCase()
        });
        var sortedArray = [];
        sortedNames.forEach(function (item, index) {
            sortedArray[item.name] = item.color;
        });

        if (hasNoData) sortedArray['no data'] = '#000000';
        return sortedArray;

    },

    // Sort palette items by colour
    _outputColors: function (hexArray, numOfColors) {
        var colors = {};
        var cntLegend = 1,
            hasNoData = false;
        for (var paletteKey in hexArray) if (hexArray.hasOwnProperty(paletteKey)) {
            if (paletteKey === 'no data') {
                hasNoData = true;
                continue;
            }
            if (numOfColors > 0 && cntLegend === numOfColors) break;
            var color = new this._Color(hexArray[paletteKey]);
            colors[paletteKey] = this._constructColor(color);
            cntLegend++
        }

        if (hasNoData) {
            var color = new this._Color('#000000');
            colors['no data'] = this._constructColor(color);

        }


        return this._sortColorsByHue(colors);

    },

    // build the HTML for the table
    _generateTableHtml: function (sortedPalette) {
        var options = this.options;
        var inHtml = ""; // store HTML here

        var sortByHTML = '';

        if (options.sortBy === 'Name') {
            sortByHTML = '<i class = "fa fa-sort-alpha-asc sort-by"></i>'
        } else {
            sortByHTML = '<i class="sort-by" style="background:radial-gradient(#4D4D4D, #CCCCCC);"></i>' +
                '<i class = "fa fa-sort-amount-desc sort-by"></i>'
        }

        var sumDropdownHtml =
            '<div class="btn-group dropdown" id="summByDropdown" role="group" >' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            glbSummarizeBy + ' ' +
            '<span class="caret"></span>' +
            ' </button > ' +
            '<ul class = "dropdown-menu" aria-labelledby="summByDropdown"> ' +
            '<li><a href="#" data-value="Species">Species</a></li> ' +
            '<li><a href="#" data-value="Sample type">Sample type</a></li> ' +
            '<li><a href="#" data-value="Collection protocol">Collection protocol</a></li> ' +
            '<li><a href="#" data-value="Project">Project </a></li> ' +
            '<li><a href="#" data-value="Protocol">Protocol</a></li> ' +
            (viewMode === 'ir' ? '<li><a href="#" data-value="Insecticide">Insecticide</a> </li> ' : '') +
            '</div> ' +
            '<div class="btn-group dropdown" role="group" id="sortByDropdown" style="float: right;">' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            sortByHTML +
            '<span class="caret"></span>' +
            ' </button > ' +
            '<ul class = "dropdown-menu" aria-labelledby="sortByDropdown"> ' +
            '<li><a href="#" data-value="<i class=\'sort-by\' style=\'background:radial-gradient(#4d4d4d, #cccccc);\'></i><i class = \'fa fa-sort-amount-desc sort-by\'></i>">Color</a></li> ' +
            '<li><a href="#" data-value="<i class = \'fa fa-sort-alpha-asc sort-by\'></i>">Name</a></li>' +
            '</div>';

        $('#table-legend-controls').html(sumDropdownHtml);

        var type = mapSummarizeByToField(options.summarizeBy).type;

        for (var obj1 in sortedPalette) if (sortedPalette.hasOwnProperty(obj1)) {

            if (obj1 === 'no data') break;
            // if (obj1 === 'no data') break;
            if (options.summarizeBy === 'Species') {

                inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="background:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? '<em>' + obj1.capitalizeFirstLetter() + '</em><br>' : '+');
            } else {
                inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="background:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? obj1.capitalizeFirstLetter() + '<br>' : '+');

            }
            inHtml += '</span>';

        }
        $('#Other-Terms-List').html(inHtml).removeClass();

        if (type === "Projects") {
            $('#Other-Terms-List').addClass('multiColumn-5')
        } else {
            $('#Other-Terms-List').addClass('multiColumn-3')
        }

    },

    // build the HTML for the legend node
    _generateLegendHtml: function (sortedPalette, numOfItems) {
        var options = this.options;
        var inHtml = ""; // store HTML here
        var cntLegend = 1; // store the number of the elements/entries in the legend

        var sortByHTML = '';

        if (options.sortBy === 'Name') {
            sortByHTML = '<i class = "fa fa-sort-alpha-asc sort-by"></i>'
        } else {
            sortByHTML = '<i class="sort-by" style="background:radial-gradient(#4D4D4D, #CCCCCC);"></i>' +
                '<i class = "fa fa-sort-amount-desc sort-by"></i>'
        }

        var dropdownsHTML =
            '<div class="btn-group dropdown" id="summByDropdown" role="group" >' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            glbSummarizeBy + ' ' +
            '<span class="caret"></span>' +
            ' </button > ' +
            '<ul class = "dropdown-menu dropdown-menu-right" aria-labelledby="summByDropdown"> ' +
            '<li><a href="#" data-value="Species">Species</a></li> ' +
            '<li><a href="#" data-value="Sample type">Sample type</a></li> ' +
            '<li><a href="#" data-value="Collection protocol">Collection protocol</a></li> ' +
            '<li><a href="#" data-value="Project">Project </a></li> ' +
            '<li><a href="#" data-value="Protocol">Protocol</a></li> ' +
            (viewMode === 'ir' ? '<li><a href="#" data-value="Insecticide">Insecticide</a> </li> ' : '') +
            '</div> ' +
            '<div class="btn-group dropdown" role="group" id="sortByDropdown" style="float: right;">' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            sortByHTML +
            '<span class="caret"></span>' +
            ' </button > ' +
            '<ul class = "dropdown-menu dropdown-menu-right" aria-labelledby="sortByDropdown"> ' +
            '<li><a href="#" data-value="<i class=\'sort-by\' style=\'background:radial-gradient(#4d4d4d, #cccccc);\'></i><i class = \'fa fa-sort-amount-desc sort-by\'></i>">Color</a></li> ' +
            '<li><a href="#" data-value="<i class = \'fa fa-sort-alpha-asc sort-by\'></i>">Name</a></li>' +
            '</div>';

        inHtml += '<div style="border: 0; margin-bottom: 5px;">' + dropdownsHTML + '</div>';
        var type = mapSummarizeByToField(options.summarizeBy).type;
        for (var obj1 in sortedPalette) if (sortedPalette.hasOwnProperty(obj1)) {
            if (cntLegend === options.numberOfColors + 1) break;

            if (options.summarizeBy === 'Species') {
                var abbrSpecies = obj1.replace(/^(\w{2})\S+\s(\w+)/, "$1. $2"); // converts Anopheles gambiae to An.
                                                                                // gambiae

                inHtml += '<span class="active-legend" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="background:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? '<em>' + abbrSpecies.capitalizeFirstLetter() + '</em><br>' : '+');
            } else {
                inHtml += '<span class="active-legend" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="background:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? obj1.capitalizeFirstLetter() + '<br>' : '+');

            }
            inHtml += '</span>';

            cntLegend++; // update the counter of legend entries
        }
        // add others
        if (numOfItems > options.numberOfColors) {

            var othersBg = "radial-gradient(" + this._colorLuminance("#FFFFFF", -0.7) + ", " + this._colorLuminance("#FFFFFF", -this.lum) + ")";
            inHtml += '<span class="active-others" data-toggle="modal" data-target="#Table-Legend-Modal" type="' + type + '"><i style="background:' + othersBg + ';"></i> ' + 'Others<br></span>';
        }

        // add Unknown
        // inHtml += '<i style="background: #000000;"></i> Unknown<br />';
        // options.palette['Unknown'] = '#000000';

        $("#legend").html(inHtml);

        var colorsArr = options.trafficlight.colorBrewer;
        // if in IR mode add the IR resistance color scale
        if (viewMode === 'ir') {

            inHtml += '<div class="data-layer-legend" style="border: 0">';
            inHtml += '<p style="text-align: left">Resistance</p>';
            inHtml += '<div id="legend-ir-scale-bar">';
            inHtml += '<div class="min-value" style="border: 0">Low</div>';
            inHtml += '<div class="scale-bars">';
            // var colorsArr = L.ColorBrewer.Diverging.RdYlBu[10].slice(); // using slice to copy array by value
            $.each(colorsArr.reverse(), function (index, value) {
                inHtml += '<i style="margin: 0; border-radius: 0; border: 0; color: ' + value + '; width: 10px; background-color: ' + value + ' ;"></i>';
            });

            inHtml += '</div></div>' +
                '<div class="max-value" style="border: 0;">High</div></div>' +
                '<p style="font-size: smaller; word-wrap: break-word; width: 100%; max-width: 190px; margin-top: 20px;">' +
                'Values have been rescaled globally and only give a relative indication of' +
                ' resistance/susceptibility. ' +
                '<span class="active-others" data-toggle="modal" data-target="#ir-normalisation-help">' +
                'More info</span></p>';

        } else if (viewMode === 'NOTabnd') {
            // abundance view // SHADING IS DISABLED FOR NOW
            inHtml += '<div class="data-layer-legend" style="border: 0">';
            inHtml += '<p style="text-align: left">Average abundance</p>';
            inHtml += '<div id="legend-ir-scale-bar">';
            inHtml += '<div class="min-value" style="border: 0">' + 0 + '</div>';
            inHtml += '<div class="scale-bars">';
            // var colorsArr = this.trafficlight.colorBrewer; // using slice to copy array by value
            $.each(colorsArr, function (index, value) {
                inHtml += '<i style="margin: 0; border-radius: 0; border: 0; color: ' + value + '; width: 10px; background-color: ' + value + ' ;"></i>';
            });

            inHtml += '</div></div>' +
                '<div class="max-value" style="border: 0;">' + Math.ceil(this.options.trafficlight.max) + '</div></div>' +
                '<p style="font-size: smaller; word-wrap: break-word; width: 100%; max-width: 190px; margin-top: 5px;">' +
                'Individuals per day of sampling<br>Values used for coloring have been log-transformed</p>';
        }

        // Populate legend when added to map
        legend.onAdd = function (map) {
            this._legendDiv.innerHTML = inHtml;
            return this._legendDiv;
        };

        // Was the legend already active? Refresh it!
        if (L.DomUtil.hasClass(this._legendDiv, "active")) {
            legend.remove();
            legend.addTo(map);
        }

    },

    /*
     function refreshLegend
     date: 27/4/2016
     purpose: A public function to refresh the legend without connection to SOLR or refreshing the map
     inputs: unsortedPalette: usually the global palette of the map
     outputs: it calls _generateLegendHtml with the sorted palette and updates the legend
     */

    refreshLegend: function (unsortedPalette) {
        var options = this.options;
        var sortedPalette = [];
        var paletteSize = _.size(unsortedPalette);
        if (options.sortBy === 'Name') {
            sortedPalette = this._outputNames(unsortedPalette, options.numberOfColors);

        } else {    // sort by color

            sortedPalette = this._outputColors(unsortedPalette, options.numberOfColors);
        }

        this._generateLegendHtml(sortedPalette, paletteSize);

        if (options.sortBy === 'Name') {
            sortedPalette = this._outputNames(unsortedPalette);

        } else {    // sort by color

            sortedPalette = this._outputColors(unsortedPalette);
        }

        // this._generateLegendHtml(sortedPalette, paletteSize);
        this._generateTableHtml(sortedPalette, paletteSize);

    },

    _populateLegend: function (result, fieldName, flyTo) {
        var options = this.options;
        var geohashLevel = "geohash_2";
        if (typeof (flyTo) === 'undefined') flyTo = options.flyTo;
        if (!fieldName) {
            fieldName = options.summarizeBy;
        } else {
            // update map options
            options.summarizeBy = fieldName;
        }

        // var pivotParams = geohashLevel + "," + mapSummarizeByToField(fieldName).summarize;

        // var doc = result.facet_counts.facet_pivot[pivotParams];
        var facets = result.facets;
        var facetResults = facets.geo.buckets;

        // save max and min abundance
        if (viewMode === 'abnd') {
            var minAbnd = 0, maxAbnd = 0;
        }

        var items = [];

        // parse results
        facetResults.forEach(function (el) {
            var geoTerms = el.terms.buckets;
            var i = 1;
            var count = el.count;
            if (viewMode === 'abnd') {
                if (maxAbnd < el.maxAbnd) {
                    maxAbnd = el.maxAbnd
                }
            }

            geoTerms.forEach(function (inEl) {
                var ratio = inEl.count / count;
                var sumField = inEl.val;
                // var index = parseInt(i);

                var points;
                // Use a scoring scheme to make sure species with a good presence per region get a proper color (we
                // only have 20 good colours)
                switch (i) {
                    case 1:
                        points = 7 * ratio;
                        break;
                    case 2:
                        points = 3 * ratio;
                        break;
                    case 3:
                        points = 1 * ratio;
                        break;
                    default:
                        points = 0;
                        break

                }

                if (items.hasOwnProperty(sumField)) {
                    items[sumField] += points;

                } else {

                    items[sumField] = points;

                }
                i++;
            });

        });


        // set trafficlight options
        var trafficlight = options.trafficlight;


        trafficlight.colorBrewer = viewMode === 'ir' ?
            L.ColorBrewer.Diverging.RdYlBu[10].slice() :
            L.ColorBrewer.Sequential.BuPu[9].slice()

        if (viewMode === 'ir') {

            trafficlight.scale = new L.CustomColorFunction(0, 1, options.trafficlight.colorBrewer, {interpolate: true});
        } else if (viewMode === 'NOTabnd') { // not currently showing a colour scale in legend
            trafficlight.scale = new L.CustomColorFunction(0, Math.log(maxAbnd), options.trafficlight.colorBrewer, {interpolate: true});
            trafficlight.min = 0;
            trafficlight.max = maxAbnd;
        }



        // this is where the legend items are scored and sorted based on their frequency/abundance
        var sortedItems = this._sortHashByValue(items);
        options.palette = this.generatePalette(sortedItems);

        this.refreshLegend(options.palette);

        // moved this here to avoid querying SOLR before the palette is done building
        filterMarkers($("#search_ac").tagsinput('items'), flyTo)

    }

});

L.control.legend = function (url, options) {

    var newLegend = new L.Control.MapLegend(options);

    if (options.summarizeBy) newLegend.options.summarizeBy = options.summarizeBy;
    newLegend.options.numberOfColors = legendSpecies;
    newLegend.options.flyTo = options.flyTo;

    newLegend.addLegendIcon();
    newLegend.bindTableFilter();

    $.getJSON(url, function (data) {
        newLegend._populateLegend(data, options.summarizeBy)
    });

    return newLegend;
};