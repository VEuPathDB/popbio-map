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
        colorsArr: L.ColorBrewer.Diverging.RdYlBu[10].slice().reverse(),
        rescale: false
    },

    // Click event handler of legend would fire after map click event
    // Adding click even this way allows legend click event to fire first
    // and cancel the lick event for the map
    initialize: function (options) {
        this._legendDiv = {};
        // Right now passing options does not affect anything, but adding it since the
        // correct way of implementing a new control is to use options to modify the object
        this.addLegendIcon(options);
        if (options.summarizeBy) {
            this.options.summarizeBy = options.summarizeBy;
        }
        this.options.numberOfColors = legendSpecies;
        this.options.flyTo = options.flyTo;
        this.options.rescale = options.rescale;

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
        //colorObj.luma = 0.3 * r + 0.59 * g + 0.11 * b;
        // Improving weights that hopefully give better sorting
        colorObj.luma = 0.241 * r + 0.691 * g + 0.068 * b;
        colorObj.red = parseInt(hex.substring(0, 2), 16);
        colorObj.green = parseInt(hex.substring(2, 4), 16);
        colorObj.blue = parseInt(hex.substring(4, 6), 16);

        return colorObj;
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

    _generateViewSelect: function (viewMode) {
        //DKDK VB-8536 Species in Pathogen to Vector Species
        if (viewMode === 'path') {
            var pathSpecies = "Vector Species";
        } else {
            var pathSpecies = "Species";
        }

        return '<ul class="dropdown-menu dropdown-menu-right" aria-labelled-by="summByDropdown">' +
            //DKDK VB-8459 VB-8650 add signposts menu; VB-8536 Species in Pathogen to Vector Species
            (viewMode === 'smpl' ? '<li><a href="#" value="Available data types">Available data types</a></li>' : '') +
            (viewMode === 'geno' ? '<li><a href="#" value="Locus">Locus</a></li>' : '') +
            (viewMode === 'geno' ? '<li><a href="#" value="Allele">Allele</a></li>' : '') +
            (viewMode === 'path' ? '<li><a href="#" value="Pathogen">Pathogen</a></li> ' : '') +
            (viewMode === 'path' ? '<li><a href="#" value="Infection status">Infection status</a></li> ' : '') +
            (viewMode === 'meal' ? '<li><a href="#" value="Blood meal host">Blood meal host</a></li> ' : '') +
            //DKDK VB-8536 Species in Pathogen to Vector Species
            '<li><a href="#" value="' + pathSpecies + '">' + pathSpecies + '</a></li>' +
            //DKDK VB-8650 block this as it goes first
            // (viewMode === 'smpl' ? '<li><a href="#" value="Available data types">Available data types</a></li>' : '') +
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

        inHtml += _.map(palette.slice(0, 20), function (item) {
            //DKDK VB-8650
            // var label = (item.name ? item.name.capitalizeFirstLetter() + '<br>' : '+');
            var label = (item.name ? item.name.capitalizeFirstLetter() : '+');

            if (options.summarizeBy === 'Species') {
                var label = '<em>' + label + '</em>';
            }

            //DKDK VB-8650
            var insertExternalLink = '';
            var insertExternalLinkLegend = 'active-legend';
            var insertExternalLinkName = '';
            var insertExternalLinkTitle = '';
            var insertExternalLinkClass = 'detailedTip';
            if (glbSummarizeBy == "Available data types") {
                if (item.name == "Abundance") {
                    // insertExternalLink = ' <div style="font-size: 0.5rem;"><a href="?view=abnd"><i class="insertExternalLink fas fa-external-link-alt fa-xs" aria-hidden="true"></i></a></div> ';
                    insertExternalLink = ' <i class="insertExternalLink fas fa-external-link-alt" name="abnd" title="' + 'Switch to ' + item.name + ' view' + '"></i> ';
                    // insertExternalLinkLegend = 'insertExternalLinkLegend';
                    insertExternalLinkName = 'abnd';
                    insertExternalLinkTitle = 'Search with ' + item.name;
                    insertExternalLinkClass = '';
                } else if (item.name == "Pathogen") {
                    insertExternalLink = ' <i class="insertExternalLink fas fa-external-link-alt" name="path" title="' + 'Switch to ' + item.name + ' view' + '"></i> ';
                    // insertExternalLinkLegend = 'insertExternalLinkLegend';
                    insertExternalLinkName = 'path';
                    insertExternalLinkTitle = 'Search with ' + item.name;
                    insertExternalLinkClass = '';
                } else if (item.name == "Blood meal host") {
                    insertExternalLink = ' <i class="insertExternalLink fas fa-external-link-alt" name="meal" title="' + 'Switch to ' + item.name + ' view' + '"></i> ';
                    // insertExternalLinkLegend = 'insertExternalLinkLegend';
                    insertExternalLinkName = 'meal';
                    insertExternalLinkTitle = 'Search with ' + item.name;
                    insertExternalLinkClass = '';
                } else if (item.name == "Insecticide res. phenotype") {
                    insertExternalLink = ' <i class="insertExternalLink fas fa-external-link-alt" name="ir" title="' + 'Switch to Insecticide Resistance view' +'"></i> ';
                    // insertExternalLinkLegend = 'insertExternalLinkLegend';
                    insertExternalLinkName = 'ir';
                    insertExternalLinkTitle = 'Search with ' + item.name;
                    insertExternalLinkClass = '';
                } else if (item.name == "Insecticide res. genotype") {
                    insertExternalLink = ' <i class="insertExternalLink fas fa-external-link-alt" name="geno" title="' + 'Switch to Genotypes view' +'"></i> ';
                    // insertExternalLinkLegend = 'insertExternalLinkLegend';
                    insertExternalLinkName = 'geno';
                    insertExternalLinkTitle = 'Search with ' + item.name;
                    insertExternalLinkClass = '';
                }
            }

                return  '<div class="active-legend-area">' +
                            '<div class="' + insertExternalLinkLegend + '" type="' + type + '"value="' + item.name + '" name="' + insertExternalLinkName + '" title="' + insertExternalLinkTitle + '">' +
                                '<div class="summ-by-value ' + insertExternalLinkClass + '">' +
                                    // '<i style="border-color:' + item.color + '"></i>' +
                                    '<i style="border-color:' + item.color + '" class="summ-by-value-item"></i>' +
                                    label +
                                '</div>' +
                            '</div>' +
                            // '<div>' + insertExternalLink + '</div>' +
                            '<div style="float: initial;">' + insertExternalLink + '</div>' +
                        '</div>' +
                        '<div class="legend-count">' + item.count + '</div>';

        }).join('')
        inHtml += '</div>';

        var othersBg = "radial-gradient(" + this._colorLuminance("#FFFFFF", -0.7) + ", " + this._colorLuminance("#FFFFFF", -this.lum) + ")";

        inHtml += '<div class="active-others" data-toggle="modal" data-target="#Table-Legend-Modal" type="' + type + '">' +
                        '<i style="background:' + othersBg + ';"></i> ' + 'Complete List<br>' +
                  '</div>';

        inHtml += '<div class="text-center border-top border-primary"><div class="btn-group" role="group">' +
                        '<div id="rescale_colors" class="btn btn-primary btn-sm btn-link">Optimize Colors</div>' +
                        '<div id="reset_colors" class="btn btn-primary btn-sm btn-link">Default Colors</div>' +
                  '</div></div>';;

        // if in IR mode add the IR resistance color scale
        if (viewMode === 'ir') {
            inHtml += '<div class="data-layer-legend" style="border: 0">';
            inHtml += '<div style="text-align: left; display: block; margin: 1em 0;">Resistance</div>';
            inHtml += '<div id="legend-ir-scale-bar">';
            inHtml += '<div class="min-value" style="border: 0">Low</div>';
            inHtml += '<div class="scale-bars">';

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

        //DKDK VB-8650 add help text
        if (viewMode === 'smpl' && glbSummarizeBy == "Available data types") {
            inHtml += '<p style="font-size: 1.0em;">: Clicking this external link icon <i class="insertExternalLinkText fas fa-external-link-alt fa-xs" aria-hidden="true"></i>' +
                    'will switch the current view to the corresponding view </p>';
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

        //DKDK VB-8650 override CSS for better handling text-overflow
        if (glbSummarizeBy !== "Available data types") {
            $("div.summ-by-value").css("float","none");
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

    refreshLegend: function (colors) {
        /*
            VB-7096: Dynamic color palettes
            The chain below extracts visible species and filters the legend based on it
            The function is run asynchronously for speed
        */

        if (colors === undefined) {
            colors = null;
        }

        var sortBy = this.options.sortBy;
        var features = getFeaturesInView();
        var paletteCategories = _.chain(features).map('options').map('icon').map('options').map('stats').flatten().groupBy('label').value();

        var palette = _(paletteCategories).map(function (val, name) {
                            if (_(colors).has(name)) {
                                color = colors[name];
                            }
                            else {
                                // Get the color assigned to the marker
                                color = val[0].color;
                            }
                            var out = {
                                name: name,
                                name_lower: _.lowerCase(name),
                                species: name,
                                count: _.sumBy(val, 'value'),
                                color: color
                            }

                            return out;
                        });

        palette = this._sortPalette(palette.value(), sortBy);

        // Now go through the complete palette and construct it in a similar
        // format as the palette created from lodash
        var completePalette = [];

        _.forOwn(this.options.palette, function(color, name) {

            var val = paletteCategories[name];

            if (val) {
                paletteEntry = {
                    name:name,
                    name_lower: _.lowerCase(name),
                    species: name,
                    count: _.sumBy(val, 'value'),
                    color: color
                }
            }
            else {
                paletteEntry = {
                    name:name,
                    name_lower: _.lowerCase(name),
                    species: name,
                    count: 0,
                    color: color
                }
            }

            completePalette.push(paletteEntry);
        });

        completePalette = this._sortPalette(completePalette, sortBy);

        this._generateLegendHtml(palette, palette.length);

        this._generateTableHtml(completePalette);

        // Adding here for now, need to check if it is hidden
        $('.leaflet-bottom.leaflet-right .leaflet-bar').show();
    },

    _sortPalette: function(palette, sortBy) {
        if (sortBy === 'name') {
            palette = _(palette).sortBy(['name_lower']);

            return palette.value();
        }
        else if (sortBy === 'count') {
            palette = _(palette).sortBy(['count']).reverse();

        }
        else if (sortBy === 'color') {
            palette = palette.map(function (x) {
                var colorObj = this._constructColor(x.color);
                x['hue'] = colorObj.hue;
                x['luma'] = colorObj.luma;
                x['sat'] = colorObj.sat;
                x['val'] = colorObj.val;
                return x;
            }.bind(this));

            // For some reason color and greyscale palettes do not get ordered correctly together
            // So sorting them separately.
            // Also sorting by lumanosity since it seems to work better than hue

            // Get only colors
            colorPalette = _.filter(palette, function(o) {
                return o.hue != 0;
            });
            colorPalette = _(colorPalette).sortBy('luma').value();

            // Get only greyscale
            greyPalette = _.filter(palette, function(o) {
               return o.hue === 0;
            });
            greyPalette = _(greyPalette).sortBy('luma').value();

            palette = _(colorPalette.concat(greyPalette));
        }

         return palette.value();
    },

    _setPalette: function() {
        /*
            Sets the palette
        */


        var sortedItems = this.sortedItems;

        if (this.options.rescale) {
            // Since we are giving more importance to visible markers, get the items
            // object so we can update their importance/abundance value
            var items = $.extend(true, {}, this.items); // make a deep copy with jQuery
            // Get highest ranked value and use that to rank up the visible markers higher
            highestValue = sortedItems[0][1];

            var visibleValueSums = {};
            // sum up the "value" attribute for the markers for each "species"
            _.chain(getFeaturesInView())
                .map('options')
                .map('icon')
                .map('options')
                .map('stats')
                .flatten()
                .groupBy('label')
                .map(function(array){
                    visibleValueSums[array[0].label] =
                        _.reduce(array, function(memo, item){return memo + item.value;},0);
                })
                .value();

            // Go through the visible marker items and give them more importance in the
            // items object
            for (var item in visibleValueSums) {
                items[item] = highestValue + visibleValueSums[item];
            }

            sortedItems = this._sortHashByValue(items);
        }

        this.options.palette = this.generatePalette(sortedItems);
    },

    _populateLegend: function (result, fieldName, flyTo) {
        var options = this.options;
        //var geohashLevel = "geohash_2";
        if (typeof (flyTo) === 'undefined') flyTo = options.flyTo;
        if (!fieldName) {
            fieldName = options.summarizeBy;
        } else {
            // update map options
            options.summarizeBy = fieldName;
        }

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

        var sortedItems = this._sortHashByValue(items);
        this.items = items;
        this.sortedItems = sortedItems;
        this._setPalette();

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

        _.each(palette, function (facet) {
            inHtml += '<span class="active-legend table-legend-term" type="' + type + '" value="' + facet.name + '">' +
                            '<i style="border-color:' + facet.color + ';" title="' + facet.name + '"></i>' +
                            (facet ? '<em>' + facet.name + '</em><br>' : '+') +
                      '</span>';
        });

        $('#Other-Terms-List').html(inHtml).removeClass();

        if (type === "Project") {
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
    legend.options.rescale = true;
    PopulationBiologyMap.data.rescale = true;

    // Preserving highchart settings when optimizing colors
    if (Highcharts.charts.length) {
        var navigatorExtremes = Highcharts.charts[0].xAxis[0].getExtremes();
        PopulationBiologyMap.data.navDates = [navigatorExtremes.min, navigatorExtremes.max];
        PopulationBiologyMap.data.resolution = $("#resolution-selector .btn-primary").val();
    }

    legend._setPalette();
    loadSolr({clear: 1, zoomLevel: map.getZoom()});
    //legend.refreshLegend(legend.options.palette);

    //DKDK VB-8372 need to reset map
    map.on("click", PopulationBiologyMap.methods.resetMap);
});

$(document).on('click', '#reset_colors', function() {
    legend.options.rescale = false;
    PopulationBiologyMap.data.rescale = false;

    // Preserving highchart settings when optimizing colors
    if (Highcharts.charts.length) {
        var navigatorExtremes = Highcharts.charts[0].xAxis[0].getExtremes();
        PopulationBiologyMap.data.navDates = [navigatorExtremes.min, navigatorExtremes.max];
        PopulationBiologyMap.data.resolution = $("#resolution-selector .btn-primary").val();
    }

    legend._setPalette();
    loadSolr({clear: 1, zoomLevel: map.getZoom()});

    //DKDK VB-8372 need to reset map
    map.on("click", PopulationBiologyMap.methods.resetMap);
});