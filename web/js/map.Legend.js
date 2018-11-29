/* Constants */
const SORT_BY_HTML = {
    'name':'<i class="fa fa-sort-alpha-down sort-by"></i>',
    'color': '<i class="sort-by" style="background:radial-gradient(#4D4D4D, #CCCCCC);"></i>',
    'count': '<i class="fa fa-hashtag sort-by"></i>',
}

const SORT_CHOICES = '<li>' + _.map(SORT_BY_HTML,
                                    function(k, v) {
                                        // Use CSS to capitalize first letter of dropdown
                                        return '<a href="#" value="' + v + '">' + k  + v + '</a>';
                                    })
                                .join('</li><li>') + '</li>';

function getFeaturesInView() {
    /*
        Returns the list of markers that are currently displayed
        within the browser window.
    */

    var features = [];
    map.eachLayer( function(layer) {
        if (layer instanceof L.Marker) {
            if (map.getBounds().contains(layer.getLatLng())) {
                features.push(layer);
            }
        }
    })

    return features;

}

function sum(numbers) {
    // Extend arrays to allow adding

    return _.reduce(numbers, function(result, current) {
        return result + parseFloat(current);
    }, 0);
}

L.Control.MapLegend = L.Control.extend({
    options: {
        position: 'bottomright',
        numberOfColors: 20,  // still not using this :(
        summarizeBy: 'Species',
        sortBy: 'count',
        lum: 0.7,
        trafficlight: {
            colorBrewer: L.ColorBrewer.Diverging.RdYlBu[10].slice()
        },
        palette: {},
        colorsArr: L.ColorBrewer.Diverging.RdYlBu[10].slice().reverse()
    },

    // Click event handler of legend would fire after map click event
    // Adding click even this way allows legend click event to fire first
    // and cancel the lick event for the map
    initialize: function (options) {
        this._legendDiv = {};
        // Right now passing options does not affect anything, but adding it since the 
        // correct way of implementing a new control is to use options to modify the object
        this.addLegendIcon(options);
    },

    // add the legend to the DOM tree
    addLegendIcon: function (options) {
        this._legendDiv = L.DomUtil.create('div', 'info legend active');
        legendDiv = this._legendDiv;

        easyButtonOptions = {
            id: 'legend-toggle',
            position: 'bottomright',
            type: 'replace',
            leafletClasses: true,
            states:[{
                stateName: 'hide-legend',
                icon: 'fa-caret-right',
                onClick: function(button) {
                    $(".legend").animate({"right": "-=310px"},350);
                    $(".easy-button-container" ).animate({ "right": "-=300px" }, 350);
                    $(".legend").removeClass("active");
                    $(".leaflet-bottom.leaflet-right .leaflet-bar").removeClass("active");
                    button.state('show-legend');
                    $(".leaflet-bottom.leaflet-right .leaflet-bar").tooltip("hide");
                } 
            }, {
                stateName: 'show-legend',
                onClick: function(button) {
                    $(".legend").animate({"right": "+=310px"},350);
                    $( ".easy-button-container" ).animate({ "right": "+=300px" }, 350);
                    $(".legend").addClass("active");
                    $(".leaflet-bottom.leaflet-right .leaflet-bar").addClass("active");
                    button.state('hide-legend');
                    $(".leaflet-bottom.leaflet-right .leaflet-bar").tooltip("hide");
                },
                icon: 'fa-caret-left'
            }]
        }

        L.easyButton(easyButtonOptions).addTo(map);

        //Setting the button to active
        $(".leaflet-bottom.leaflet-right .leaflet-bar").addClass("active");
        L.DomEvent.addListener(legendDiv, 'click', this._clicked, this);

        return legendDiv;
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

    /*_Color: function (hexVal) { //define a Color class for the color objects
        this.hex = hexVal;
    },*/

    _constructColor: function (hex) {
        var colorObj = {};
        var hex = hex ? hex.replace('#', '') : '#000000';
        colorObj.hex = hex;
        //var hex = colorObj.hex.substring(1);
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

   /* _sortColorsByHue: function (colors) {
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
    },*/


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
    /*_outputNames: function (hexArray, numOfColors) {
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
            '<div class="btn-group dropdown" id="summByDropdown" role="group" title="Colorize markers and facet data by..." >' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            glbSummarizeBy + ' ' +
            '<span class="caret"></span>' +
            ' </button > ' +
            '<ul class = "dropdown-menu" aria-labelledby="summByDropdown"> ' +
            (viewMode === 'geno' ? '<li><a href="#" data-value="Locus">Locus</a></li> ' : '') +
            (viewMode === 'geno' ? '<li><a href="#" data-value="Allele">Allele</a></li> ' : '') +
            (viewMode === 'path' ? '<li><a href="#" data-value="Pathogen">Pathogen</a></li> ' : '') +
            (viewMode === 'path' ? '<li><a href="#" data-value="Infection status">Infection status</a></li> ' : '') +
            '<li><a href="#" data-value="Species">Species</a></li> ' +
            '<li><a href="#" data-value="Sample type">Sample type</a></li> ' +
            '<li><a href="#" data-value="Collection protocol">Collection protocol</a></li> ' +
            (viewMode === 'abnd' ? '<li><a href="#" data-value="Attractant">Attractant</a></li> ' : '') +
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
                    '<i style="border-color:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? '<em>' + obj1.capitalizeFirstLetter() + '</em><br>' : '+');
            } else {
                inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="border-color:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? obj1.capitalizeFirstLetter() + '<br>' : '+');
            }
            inHtml += '</span>';
        }

        $('#Other-Terms-List').html(inHtml).removeClass();

        if (type === "Projects") {
            $('#Other-Terms-List').addClass('multiColumn-5')
        } else {
            $('#Other-Terms-List').addClass('multiColumn-3')
        }
    },*/

    _generateViewSelect(viewMode) {
        return '<ul class="dropdown-menu dropdown-menu-right" aria-labelled-by="summByDropdown">' +
            (viewMode === 'geno' ? '<li><a href="#" value="Locus">Locus</a></li>' : '') +
            (viewMode === 'geno' ? '<li><a href="#" value="Allele">Allele</a></li>' : '') +
            (viewMode === 'path' ? '<li><a href="#" value="Pathogen">Pathogen</a></li> ' : '') +
            (viewMode === 'path' ? '<li><a href="#" value="Infection status">Infection status</a></li> ' : '') +
            '<li><a href="#" value="Species">Species</a></li>' +
            '<li><a href="#" value="Sample type">Sample type</a></li>' +
            '<li><a href="#" value="Collection protocol">Collection protocol</a></li>' +
            (viewMode === 'abnd' ? '<li><a href="#" value="Attractant">Attractant</a></li> ' : '') +
            '<li><a href="#" value="Project">Project</a></li>' +
            '<li><a href="#" value="Protocol">Protocol</a></li>' +
            (viewMode === 'ir' ? '<li><a href="#" value="Insecticide">Insecticide</a></li>' : '') +
            '</ul>';
    },

    // build the HTML for the legend node
    //_generateLegendHtml: function (sortedPalette, numOfItems) {
    _generateLegendHtml: function (palette, numOfItems) {
        var options = this.options;
        var inHtml = ''; // store HTML here
        
        /*var cntLegend = 1; // store the number of the elements/entries in the legend

        var sortByHTML = '';

        if (options.sortBy === 'Name') {
            sortByHTML = '<i class = "fa fa-sort-alpha-asc sort-by"></i>'
        } else {
            sortByHTML = '<i class="sort-by" style="background:radial-gradient(#4D4D4D, #CCCCCC);"></i>' +
                '<i class = "fa fa-sort-amount-desc sort-by"></i>'
        }*/

        var dropdownsHTML =
            '<div class="btn-group dropdown" id="summByDropdown" role="group" title="Colorize workers and facet data by...">' + 
            '<button class="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            glbSummarizeBy + ' ' +
            '<span class="caret"></span>' +
            '</button>' +
            this._generateViewSelect(viewMode) +
            '</div>' + 
            '<div class="btn-group dropdown" role="group" id="sortByDropdown" style="float: right;">' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            //sortByHTML +
            SORT_BY_HTML[options.sortBy] + 
            ' <span class="caret"></span>' +
            '</button>' +
            '<ul class = "dropdown-menu dropdown-menu-right" aria-labelledby="sortByDropdown"> ' +
            SORT_CHOICES +
            '</ul>' +
            '</div>';
            
        var type = mapSummarizeByToField(options.summarizeBy).type;
        inHtml += '<div style="border: 0; margin-bottom: 5px;">' + dropdownsHTML + '</div>';
        /*for (var obj1 in sortedPalette) if (sortedPalette.hasOwnProperty(obj1)) {
            if (cntLegend === options.numberOfColors + 1) break;*/

            // Below was already uncommented
            // VB-6377 use full name, but ellipsis supporting tooltip
            // if (options.summarizeBy === 'Species') {
            //     var abbrSpecies = obj1.replace(/^(\w{2})\S+\s(\w+)/, "$1. $2"); // converts Anopheles gambiae to An.
            //                                                                     // gambiae

            //     inHtml += '<span class="active-legend" type="' + type + '" value="' + obj1 + '"> ' +
            //         '<i style="background:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? '<em>' + abbrSpecies.capitalizeFirstLetter() + '</em><br>' : '+');
            // } else {
            //     inHtml += '<span class="active-legend" type="' + type + '" value="' + obj1 + '"> ' +
            //         '<i style="background:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? obj1.capitalizeFirstLetter() + '<br>' : '+');

            // }
            // inHtml += '</span>';

        inHtml += _.map(palette.slice(0, 20), function (item) {
            var label = (item.name ? item.name.capitalizeFirstLetter() + '<br>' : '+');

            /*if (options.summarizeBy === 'Species') {
                // var abbrSpecies = obj1.replace(/^(\w{2})\S+\s(\w+)/, "$1. $2"); // converts Anopheles gambiae to An.
                                                                                // gambiae
                inHtml += '<div class="active-legend detailedTip" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="border-color:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? '<em>' + obj1.capitalizeFirstLetter() + '</em><br>' : '+');
            } else {
                inHtml += '<div class="active-legend detailedTip" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="border-color:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? obj1.capitalizeFirstLetter() + '<br>' : '+');
            }
            inHtml += '</div>';*/

            if (options.summarizeBy === 'Species') {
                var label = '<em>' + label + '</em>';
            }

            return '<div class="active-legend detailedTip" type="' + type + '"value="' + item.name + '">' +
                        '<div class="summ-by-value">' +
                            '<i style="border-color:' + item.color + ';" title="' + item.name.capitalizeFirstLetter() + '"></i>' +
                            label +
                        '</div>' +
                        '<div class="legend-count">' + item.count + '</div>' +
                    '</div>';
                        
        }).join('')
        inHtml += '</div>';

        // add others
        /*if (numOfItems > options.numberOfColors) {
            var othersBg = "radial-gradient(" + this._colorLuminance("#FFFFFF", -0.7) + ", " + this._colorLuminance("#FFFFFF", -this.lum) + ")";
            // inHtml += '<span class="active-others" data-toggle="modal" data-target="#Table-Legend-Modal" type="' + type + '"><i style="background:' + othersBg + ';"></i> ' + 'Others<br></span>';
            inHtml += '<div class="active-others detailedTip" data-toggle="modal" data-target="#Table-Legend-Modal" type="' + type + '"><i style="background:' + othersBg + ';"></i> ' + 'Others<br></div>';
        }*/

        var othersBg = "radial-gradient(" + this._colorLuminance("#FFFFFF", -0.7) + ", " + this._colorLuminance("#FFFFFF", -this.lum) + ")";
        inHtml += '<div class="active-others detailedTip" data-toggle="modal" data-target="#Table-Legend-Modal" type="' + type + '">' + 
                        '<i style="background:' + othersBg + ';"></i> ' + 'Complete List<br>' +
                  '</div>';

        inHtml += '<div class="text-center border-top border-primary"><div class="btn-group" role="group">' +
                        '<div id="rescale_colors" class="btn btn-primary btn-sm btn-link">Rescale Colors</div>' +
                        '<div id="reset_colors" class="btn btn-primary btn-sm btn-link">Reset Colors</div>' +
                  '</div></div>';;

        // add Unknown
        // inHtml += '<i style="background: #000000;"></i> Unknown<br />';
        // options.palette['Unknown'] = '#000000';

        // if in IR mode add the IR resistance color scale
        if (viewMode === 'ir') {
            inHtml += '<div class="data-layer-legend" style="border: 0">';
            inHtml += '<p style="text-align: left">Resistance</p>';
            inHtml += '<div id="legend-ir-scale-bar">';
            inHtml += '<div class="min-value" style="border: 0">Low</div>';
            inHtml += '<div class="scale-bars">';
            // var colorsArr = L.ColorBrewer.Diverging.RdYlBu[10].slice(); // using slice to copy array by value
            $.each(options.colorsArr, function (index, value) {
                inHtml += '<i style="margin: 0; color: ' + value + '; background: ' + value + ' ;"></i>';
            });

            inHtml += '</div></div>' +
                '<div class="max-value" style="border: 0;">High</div></div>' +
                '<p>' +
                'Values have been rescaled globally and only give a relative indication of' +
                ' resistance/susceptibility. ' +
                '<span class="active-others" data-toggle="modal" data-target="#ir-normalisation-help">' +
                'More info</span></p>';
        }

        // Adding a wrapper div to make vertical-align work correctly
        inHtml = '<div class="legend-contents">' + inHtml + '</div>';

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
     inputs: colors: A set of colors to use for the palette
     outputs: it calls _generateLegendHtml with the sorted palette and updates the legend
     */
    /*refreshLegend: function (unsortedPalette) {
        var options = this.options;
        var sortedPalette = [];
        var paletteSize = _.size(unsortedPalette);
        if (options.sortBy === 'Name') {
            sortedPalette = this._outputNames(unsortedPalette, options.numberOfColors);
        } else {    // sort by color
            sortedPalette = this._outputColors(unsortedPalette, options.numberOfColors);
        }*/

    refreshLegend: function (colors=null) {
        /*
            VB-7096: Dynamic color palettes
            The chain below extracts visible species and filters the legend based on it
            The function is run asynchronously for speed
        */

        var sortBy = this.options.sortBy;
        var features = getFeaturesInView();
        var palette = _.chain(getFeaturesInView())
                        .map('options')
                        .map('icon')
                        .map('options')
                        .map('stats')
                        .flatten()
                        .groupBy('label')
                        .map(function (val, species) {
                            if (_(colors).has(species)) {
                                color = colors[species];
                            }
                            else {
                                color = val[0].color;
                            }
                            var out = {
                                name: species,
                                name_lower: _.lowerCase(species),
                                species: species,
                                count: _.sumBy(val, 'value'),
                                color: color
                            }

                            return out;
                        });

        if (sortBy === 'name') {
            palette = _(palette).sortBy(['name_lower']);
        }
        else if (sortBy === 'count') {
            palette = _(palette).sortBy(['count']).reverse();
        }
        else if (sortBy === 'color') {
            palette = palette.map(function (x) {
                var colorObj = this._constructColor(x.color);
                x['hue'] = colorObj.hue;
                return x;
            }.bind(this)).sortBy('hue').reverse();
        }

        /*this._generateLegendHtml(sortedPalette, paletteSize);

        if (options.sortBy === 'Name') {
            sortedPalette = this._outputNames(unsortedPalette);
        } else {    // sort by color
            sortedPalette = this._outputColors(unsortedPalette);
        }*/

        // this._generateLegendHtml(sortedPalette, paletteSize);
        //this._generateTableHtml(sortedPalette, paletteSize);
        var palette = palette.value();
        this._generateLegendHtml(palette, palette.length);
        this._generateTableHtml(palette, palette.length);

        // Adding here for now, need to check if it is hidden
        $('.leaflet-bottom.leaflet-right .leaflet-bar').show();
    },

    _setPalette: function(rescale=false) {
        /*
            Sets the palette
        */
        var sortedItems = this.sortedItems;

        if (rescale) {
            var visibleMarkers = _.chain(getFeaturesInView())
                                    .map('options')
                                    .map('icon')
                                    .map('options')
                                    .map('stats')
                                    .flatten()
                                    .groupBy('label')
                                    .keys()
                                    .value();

            // Filter sorted items using their visibility on the map
            var sortedItems = _(sortedItems).sortBy(function(x) {
                return -visibleMarkers.indexOf(x[0]) >= 0;
            }).value();
        }

        var options = this.options;
        options.palette = this.generatePalette(sortedItems);
        //this.refreshLegend(options.palette);
    },

    _populateLegend: function (result, fieldName, flyTo) {
        debugger;
        var options = this.options;
        //var geohashLevel = "geohash_2";
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
            var minAbnd = 0;
            var maxAbnd = 0;
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
        }

        // this is where the legend items are scored and sorted based on their frequency/abundance
        /*var sortedItems = this._sortHashByValue(items);
        options.palette = this.generatePalette(sortedItems);
        this.refreshLegend(options.palette);*/

        var sortedItems = this._sortHashByValue(items);

        this.sortedItems = sortedItems;
        this._setPalette(sortedItems);

        //Initialize tooltip only if it has not been initialized already
        if ($(".legend").attr("data-original-title") === undefined) {
            $(".legend").tooltip({
                title: "Click to add search terms",
                delay: { "show": 1000, "hide": 0 }
            });
        }

        // moved this here to avoid querying SOLR before the palette is done building
        filterMarkers($("#search_ac").tagsinput('items'), flyTo)
    },

    _generateTableHtml: function (palette) {
        var options = this.options;
        var inHtml = ""; // store HTML here

        var sumDropdownHtml =
            '<div class="btn-group dropdown" id="summByDropdown" role="group" title="Colorize markers and facet data by..." >' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            glbSummarizeBy + ' ' +
            '<span class="caret"></span>' +
            ' </button > ' +
            this._generateViewSelect(viewMode) +
            '</div> ' +
            '<div class="btn-group dropdown" role="group" id="sortByDropdown" style="float: right;">' +
            '<button class="btn btn-default dropdown-toggle" type="button"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
            //sortByHTML +
            SORT_BY_HTML[options.sortBy] + 
            '<span class="caret"></span>' +
            '</button>' +
            '<ul class = "dropdown-menu" aria-labelledby="sortByDropdown"> ' +
            SORT_CHOICES +
            '</ul>' +
            '</div>';

        $('#table-legend-controls').html(sumDropdownHtml);

        var type = mapSummarizeByToField(options.summarizeBy).type;

        /*for (var obj1 in sortedPalette) if (sortedPalette.hasOwnProperty(obj1)) {
            if (obj1 === 'no data') break;
            // if (obj1 === 'no data') break;
            if (options.summarizeBy === 'Species') {
                inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="border-color:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? '<em>' + obj1.capitalizeFirstLetter() + '</em><br>' : '+');
            } else {
                inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + obj1 + '"> ' +
                    '<i style="border-color:' + sortedPalette[obj1] + ';" title="' + obj1.capitalizeFirstLetter() + '"></i> ' + (obj1 ? obj1.capitalizeFirstLetter() + '<br>' : '+');
            }
            inHtml += '</span>';
        }*/

        _.each(palette, function (facet) {
            inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + facet.name + '">' +
                            '<i style="border-color:' + facet.color + ';" title="' + facet.name + '"></i>' +
                            (facet ? '<em>' + facet.name + '</em><br>' : '+') +
                      '</span>';
        });

        $('#Other-Terms-List').html(inHtml).removeClass();

        if (type === "Projects") {
            $('#Other-Terms-List').addClass('multiColumn-5')
        } else {
            $('#Other-Terms-List').addClass('multiColumn-3')
        }
    },

    // Will need to add the click handler as a passable property so this reset map code does not look hacky
    _clicked: function() {
        // console.log("i got clicked");
        // Only way I could think of that will allow the click event to clear the markers when selecting an empty spot
        // But allow the legend values to also interact with the map
        map.off("click", PopulationBiologyMap.methods.resetMap);
    }   
});

L.control.legend = function (url, options) {
    /*
        args:
            url - URL used to set colors
            options - legend options
    */
    var newLegend = new L.Control.MapLegend(options);

    if (options.summarizeBy) newLegend.options.summarizeBy = options.summarizeBy;
    newLegend.options.numberOfColors = legendSpecies;
    newLegend.options.flyTo = options.flyTo;
    newLegend.bindTableFilter();

    $.getJSON(url, function (data) {
        newLegend._populateLegend(data, options.summarizeBy);
        $(".legend .dropdown").tooltip({
            placement: "left",
            delay: { "show": 1000, "hide": 0 }
        });
    });

    return newLegend;
};

/* Legend handlers */

// Rescale colors
$(document).on('click', '#rescale_colors', function() {
    legend._setPalette(true);
    loadSolr({clear: 1, zoomLevel: map.getZoom()});
    //legend.refreshLegend(legend.options.palette);
});

$(document).on('click', '#reset_colors', function() {
    legend._setPalette(false);
    loadSolr({clear: 1, zoomLevel: map.getZoom()});
});

