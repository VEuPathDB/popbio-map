# Configuring SOLR cores and search handlers

## Introduction

All the data displayed on the PopBio Map are fetched asynchronously from SOLR
using AJAX. The map currently relies on 2 SOLR cores:
- The main SOLR core (**vp_popbio**) that stores the index of all the samples stored
  in the Chado database
- The auto-complete core (**vb_ta**) that enables the map to offer smart auto-complete
  suggestions.

## Description of the main (vp_popbio) core

### Configuration files

| Filename                                                                  | Purpose                                                                                |                                Wiki                                 |
|:--------------------------------------------------------------------------|:---------------------------------------------------------------------------------------|:-------------------------------------------------------------------|
| [schema.xml](../SOLR/vb_popbio/conf/schema.xml)                           | Schema configuration and definitions for basic field types                             | [link](https://wiki.apache.org/solr/SchemaXml)            |
| [schema_extra_types.xml](../SOLR/vb_popbio/conf/schema_extra_types.xml)   | Definition of extra field types (same format as schema.xml)                            | [link](https://wiki.apache.org/solr/SchemaXml)            |
| [schema_extra_fields.xml](../SOLR/vb_popbio/conf/schema_extra_fields.xml) | Definition of extra fields (same format as schema.xml)                                 | [link](https://wiki.apache.org/solr/SchemaXml)            |
| [solrconfig.xml](../SOLR/vb_popbio/conf/solrconfig.xml)                   | Core configuration, including search handlers                                          | [link](https://wiki.apache.org/solr/SolrConfigXml)          |
| [configoverlay.json](../SOLR/vb_popbio/conf/configoverlay.json)           | Newer type core configuration, allows defining search handler in JSON using a rest API | [link](https://cwiki.apache.org/confluence/display/solr/Config+API) |


The vb_popbio core uses the exact same JSON dump as the core powering VectorBase's search.
For this reason most of the schema definitions are identical to the VB search core,
although over time we kept adding additional information at the JSON dump which was
only meant to be utilised in the map. As a result one should not assume that the
files are identical anymore. Ideally, both vp_popbio and the VB search core
should have identical *schema.xml*, *schema_extra_types.xml* and *schema_extra_fields.xml*
files with all the extra bits required defined in a separate config!

### Search handlers

SOLR search handlers are types of request handlers that allow us to pre-configure
how SOLR responds to specific search requests. We can define search defaults, or
force specific parameters regardless of the user query. That allow us to optimise and secure
SOLR while significantly reducing the complexity of the query string that we have to
construct.
An example search handler from [solrconfig](../SOLR/vb_popbio/conf/solrconfig.xml) looks
like that:

```xml
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

## Description of the auto-complete (vb_ta) core
