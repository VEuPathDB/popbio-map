# Configuring SOLR cores and search handlers


## Introduction

All the data displayed on the PopBio Map are fetched asynchronously from SOLR using AJAX. The
map currently relies on 2 SOLR cores:
- The main SOLR core (**vp_popbio**) that stores the index of all the samples stored in the
  Chado database
- The auto-complete core (**vb_ta**) that enables the map to offer smart auto-complete
  suggestions.

## Description of the main (vp_popbio) core

### Configuration files

| Filename                                                                  | Purpose                                                                                | Wiki                                                                |
|:--------------------------------------------------------------------------|:---------------------------------------------------------------------------------------|:--------------------------------------------------------------------|
| [schema.xml](../SOLR/vb_popbio/conf/schema.xml)                           | Schema configuration and definitions for basic field types                             | [link](https://wiki.apache.org/solr/SchemaXml)                      |
| [schema_extra_types.xml](../SOLR/vb_popbio/conf/schema_extra_types.xml)   | Definition of extra field types (same format as schema.xml)                            | [link](https://wiki.apache.org/solr/SchemaXml)                      |
| [schema_extra_fields.xml](../SOLR/vb_popbio/conf/schema_extra_fields.xml) | Definition of extra fields (same format as schema.xml)                                 | [link](https://wiki.apache.org/solr/SchemaXml)                      |
| [solrconfig.xml](../SOLR/vb_popbio/conf/solrconfig.xml)                   | Core configuration, including search handlers                                          | [link](https://wiki.apache.org/solr/SolrConfigXml)                  |
| [configoverlay.json](../SOLR/vb_popbio/conf/configoverlay.json)           | Newer type core configuration, allows defining search handler in JSON using a rest API | [link](https://cwiki.apache.org/confluence/display/solr/Config+API) |


The vb_popbio core uses the exact same JSON dump as the core powering VectorBase's search. For
this reason most of the schema definitions are identical to the VB search core, although over
time we kept adding additional information at the JSON dump which was only meant to be utilised
in the map. As a result one should not assume that the files are identical anymore. Ideally,
both vp_popbio and the VB search core should have identical *schema.xml*,
*schema_extra_types.xml* and *schema_extra_fields.xml* files with all the extra bits required
defined in a separate config!

### Search handlers

SOLR search handlers are types of request handlers that allow us to pre-configure how SOLR
responds to specific search requests. We can define search defaults, or force specific
parameters regardless of the user query. That allow us to optimise and secure SOLR while
significantly reducing the complexity of the query string that we have to construct. An example
search handler from [solrconfig](../SOLR/vb_popbio/conf/solrconfig.xml) looks like that:


``` xml
<requestHandler name="/smplMarkers" class="solr.SearchHandler">
    <!-- default values for query parameters can be specified, these
         will be overridden by parameters in the request
      -->
    <lst name="defaults">
        <str name="echoParams">explicit</str>
        <str name="df">text</str>
        <int name="rows">10000000</int>
        <str name="wt">json</str>
        <str name="json.nl">map</str>
    </lst>
    <!-- always append these query parameters in the request -->
    <lst name="appends">
        <str name="fq">bundle:pop_sample</str>
        <str name="fq">has_geodata:true</str>
        <str name="fq">-sample_size_i:0</str>
    </lst>
    <!-- always use these query parameters, overwriting the ones 
         in the request 
    -->
    <lst name="invariants">
        <str name="fl">id,geo_coords,species_category</str>
        <str name="q.op">OR</str>
    </lst>

</requestHandler>
```

There are four **essential** search handlers defined for each map view in vb_popbio (where xxxx
is replaced by the internal name of the view -_smpl_ for sample, _ir_ for insecticide
resistance, _abnd_ for abundance, etc):

1. **xxxxPalette** is the first handler called when initialising a view and/or when changing the
   field that map markers are summarised by (e.g. species or collection protocol). It returns
   the counts of each term faceted by geohash. These are parsed to generated the list of terms
   in the dataset and assign palette colours based on the popularity and the spread of the term
   around the globe (more popular and spread-out terms get one of the 20 colours, less popular
   terms are assigned a greyscale value)

   Parameters supplied are:
   - `q`: a valid SOLR query. Under normal circumstances this should be `*:*` as we are
     interested in the global popularity of the terms for the purposes of palette creation
   - `geo`: the geohash level used for faceting the terms. Default is `geohash_2`
   - `term`: the field to summarise by. Default is `species_category`

   Example results (with comments):

   ``` javascript
    // header and results section excluded from this example
    {
      "facets": {
        "count": 78886,
        "geo": {
          // facet by geohash
          "buckets": [
            {
              // geohash value
              "val": "ef",
              "count": 12287,
              // facet by term, in this case **species_category**
              "terms": {
                "buckets": [
                  {
                    "val": "Anopheles coluzzii",
                    "count": 4538
                  },
                  {
                    "val": "Anopheles arabiensis",
                    "count": 3209
                  }
                ]
              }
            },
            {
              "val": "9z",
              "count": 12184,
              "terms": {
                "buckets": [
                  {
                    "val": "Culex pipiens group (Bartholomay et al.)",
                    "cou nt": 3172
                  },
                  {
                    "val": "Aedes vexans sensu lato",
                    "count": 2726
                  }
                ]
              }
            }
          ]
        }
      }
    }
   ```

2. **xxxxGeoclust** is the handler that returns the data for the map markers. It returns the
   counts of each term faceted by geohash along with geohash statistics such as average latitude
   and longitude. These are parsed to generated the list of terms in the markers and build the
   outer and inner rings. The results are stored locally (until the map is refreshed by panning
   or zooming) and are also used to generate the pie charts in the side panel.

   Parameters supplied are:
   - `q`: a valid SOLR query built using the search terms present in the search bar of the map
   - `bbob`: the bounding box of the map. Syntax is `bbox=geo_coords:[-90,-180 TO 90,180]` where
     `geo_coords` is the name of the field where the co-ordinates of the sample are stored
   - `geo`: the geohash level used for faceting the terms. The level changes based on the zoom
     level of the map
   - `term`: the field to summarise by. Default is `species_category`

   Example results for IR view (with comments):

   ``` javascript
     // header and results section excluded from this example
     {
       "facets": {
         "count": 6550,
         "geo": {
         // facet by geohash
           "buckets": [
             {
               "val": "ec",
               "count": 260,
               // statistics used for the markers location and bounding box
               "ltAvg": 8.978521423076918,
               "ltMin": 5.64335,
               "ltMax": 11.23,
               "lnAvg": -3.5522733615384605,
               "lnMin": -10.5906,
               "lnMax": -0.00861,
               // average insecticide resistance used for colouring the inner ring of the marker
               "irAvg": 0.4468917119818238,
               // facet by term, in this case **species_category**
               "term": {
                 "buckets": [
                   {
                     "val": "Anopheles gambiae sensu lato",
                     "count": 224
                   },
                   {
                     "val": "Culex decens",
                     "count": 16
                   },
                   {
                     "val": "Aedes aegypti",
                     "count": 12
                   },
                   {
                     "val": "Culex quinquefasciatus",
                     "count": 8
                   }
                 ]
               }
             }
           ]
         }
       }
     }
   ```

3. **xxxxTable** returns the details for the samples in each marker. Those are then displayed in
   the table view of the side panel.

   Parameters supplied are:
   - `q`: a valid SOLR query built using the search terms present in the search bar of the map.
     This query string is the same as the one used for **xxxxGeoclust**
   - `geo_coords`: the bounding box of the marker. The bounding box is generated using the min
     and max latitude and longitude values of the marker (returned earlier by **xxxxGeoclst**).
     The bounding box is addes as a filter query in the SOLR query string using standard fq
     syntax as `fq=geo_coords:[7.15,12.95 TO 10.87,16.43]`
   - `sort`: the standard SOLR sort parameter. Default is `id asc`. This sort order is also used
     in the table.
   - `cursorMark`: to enable the infinite scrolling of the table view we are utilising SOLR
     cursors by adding `cursorMark=*` to the query string the first time we ask for the contents
     of the marker. The results contain (by default) the first 20 samples and a parameter called
     `nextCursorMark` the value of which is supplied as the value of `cursorMark` in the next
     query to get the next 20 results, etc. We detect when we need to ask for more results by
     tracking the visible portions of the DOM element that contains the tables using Javascript.
     More details about SOLR cursors
     [here](https://cwiki.apache.org/confluence/display/solr/Pagination+of+Results).

    Example results for IR view (with comments):

    ``` javascript
    {
      // response header excluded from the example
      "response": {
        // number of results
        "numFound": 141,
        "start": 0,
        "docs": [
          // sample details (only 1 sample shown)
          {
            "accession": "VBA0117003",
            "bundle_name": "Sample phenotype",
            "url": "/popbio/assay/?id=VBA0117003",
            "sample_type": "pool",
            "collection_protocols": [
              "collection of adults"
            ],
            "geo_coords": "7.32,13.58",
            "geolocations": [
              "Ngaoundere"
            ],
            "species_category": [
              "Anopheles gambiae sensu lato"
            ],
            "projects": [
              "VBP0000009"
            ],
            "collection_date_range": [
              "1997-05-01"
            ],
            "collection_date": [
              "1997-05-01T00:00:00Z"
            ],
            "protocols": [
              "WHO paper kit DT"
            ],
            "phenotype_value_f": 100.0,
            "phenotype_value_unit_s": "percent",
            "phenotype_value_type_s": "mortality rate",
            "insecticide_s": "DDT",
            "concentration_f": 4.0,
            "concentration_unit_s": "percent",
            "sample_size_i": 40
          }
        ]
      },
      // cursorMark value to get the next set of results
      "nextCursorMark": "AoEwVkJBMDExNzg4OC4xNDI3OA=="
    }
    ```


4. **xxxxExport**

   abndBeeswarm


## Description of the auto-complete (vb_ta) core

