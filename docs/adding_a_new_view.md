# Adding a new view to the PopBio Map

## Introduction

Popbio Map is built around the idea of flexibility and scalability. It was designed to allow
easy addition of not only huge amounts of data but also new data types.
So far the map was two views:
1. **Samples view:** A general view to display all data with geographical coordinates that
   are currently stored in the PopBio Chado database. Exception to this rule are the special
   sample types for storing abundance samples with a sample size of 0. These sample types
   are currently excluded from this view
2. **Insecticide Resistance view:** A view to display PopBio samples with IR assays results.
   This view also includes some extra features compared to the general samples view
    - A special violin/beeswarm plot to visualise and compare IR
    - Map markers colored by their normalised IR value
    - Option to summarise the markers by Insecticide
    - Some extra, IR-related, fields in the table view

Adding a new view to the map can be straightforward but also challenging, depending on the
complexity of the extra features the view requires.

This document will try to cover the necessary steps needed to add a basic new view and then how to customise it using the "Abundance view" as an example.


## Defining SOLR search handlers

## White-listing SOLR handlers in the SOLR security proxy

## Including the new view in the DOM

## Custom map markers


