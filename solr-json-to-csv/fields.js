/**
 * Created by maccallr on 2017-09-27.
 */

"use strict";

module.exports = {
    ir: [
        {
            name: 'exp_sample_id_s',
            label: 'Sample ID',
            quoted: false
        },
        //DKDK VB-7133 sample label
        {
            name: 'exp_sample_name_s',
            label: 'Sample label',
            quoted: true
        },
        {
            name: 'exp_assay_id_s',
            label: 'Assay ID',
            quoted: false
        },
        {
            name: 'exp_bundle_name_s',
            label: 'Record type',
            quoted: false
        },
        {
            name: 'exp_species_s',
            label: 'Species',
            quoted: false
        },
        {
            name: 'exp_sample_type_s',
            label: 'Sample type',
            quoted: false
        },
        {
            name: 'exp_sample_size_i',
            label: 'Sample size',
            quoted: false
        },
        {
            name: 'exp_label_s',
            label: 'Label',
            quoted: true
        },
        {
            name: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            quoted: false
        },
        {
            name: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            quoted: true,
            filter: function (dates) {
                var newDates = [];
                for (var i = 0, len = dates.length; i < len; i++) {
                    // console.dir(dates[i])
                    newDates.push(dates[i].replace(/[\[\]]/g, ''));
                }
                return newDates
            }
        },
        {
            name: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            quoted: true
        },
        {
            name: 'exp_projects_ss',
            label: 'Projects',
            quoted: true
        },
        //DKDK VB-8369 separating Coordinates into Lat & Long
        {
            name: 'exp_geo_coords_s',
            label: 'Latitudes',
            quoted: true,
            filter: function (coord) {
                var latitude = coord.split(',')[0];
                return latitude
            }
        },
        {
            name: 'exp_geo_coords_s',
            label: 'Longitudes',
            quoted: true,
            filter: function (coord) {
                var longitude = coord.split(',')[1];
                return longitude
            }
        },
        {
            name: 'exp_geolocations_ss',
            label: 'Locations',
            quoted: true
        },
        {
            name: 'exp_phenotype_type_s',
            label: 'Phenotype type',
            quoted: false
        },
        {
            name: 'exp_insecticide_s',
            label: 'Insecticide',
            quoted: true

        },
        {
            name: 'exp_protocols_ss',
            label: 'Protocols',
            quoted: true
        },
        {
            name: 'exp_concentration_f',
            label: 'Concentration',
            quoted: false
        },
        {
            name: 'exp_concentration_unit_s',
            label: 'Concentration unit',
            quoted: false
        },
        {
            name: 'exp_duration_f',
            label: 'Duration',
            quoted: false
        },
        {
            name: 'exp_duration_unit_s',
            label: 'Duration unit',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_f',
            label: 'Phenotype value',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_unit_s',
            label: 'Phenotype value unit',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_type_s',
            label: 'Phenotype value type',
            quoted: false
        },
        {
            name: 'exp_citations_ss',
            label: 'Citations',
            quoted: true
        },
        {
            name: 'exp_tags_ss',
            label: 'Tag',
            quoted: true
        },
        {
            name: 'exp_attractants_ss',
            label: 'Attractants',
            quoted: true
        },
        {
            name: 'exp_licenses_ss',
            label: 'Usage license',
            quoted: true
        },
        {
            name: 'exp_sex_s',
            label: 'Sex',
            quoted: false
        },
        {
            name: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            quoted: true
        },
        //DKDK VB-8663 add geolocation_provenance_s & geolocation_precision_s for Export
        {
            name: 'exp_geolocation_provenance_s',
            label: 'Geolocation provenance',
            quoted: true
        },
        {
            name: 'exp_geolocation_precision_s',
            label: 'Geolocation precision',
            quoted: true
        }
    ],
    smpl: [
        {
            name: 'exp_sample_id_s',
            label: 'Sample ID',
            quoted: false
        },
        {
            name: 'exp_bundle_name_s',
            label: 'Record type',
            quoted: false
        },
        {
            name: 'exp_species_s',
            label: 'Species',
            quoted: false
        },
        {
            name: 'exp_sample_type_s',
            label: 'Sample type',
            quoted: false
        },
        {
            name: 'exp_label_s',
            label: 'Label',
            quoted: true
        },
        {
            name: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            quoted: false
        },
        {
            name: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            quoted: true,
            filter: function (dates) {
                var newDates = [];
                for (var i = 0, len = dates.length; i < len; i++) {
                    // console.dir(dates[i])
                    newDates.push(dates[i].replace(/[\[\]]/g, ''));
                }
                return newDates
            }
        },
        {
            name: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            quoted: true
        },
        {
            name: 'exp_projects_ss',
            label: 'Projects',
            quoted: true
        },
        //DKDK VB-8369 separating Coordinates into Lat & Long
        {
            name: 'exp_geo_coords_s',
            label: 'Latitudes',
            quoted: true,
            filter: function (coord) {
                var latitude = coord.split(',')[0];
                return latitude
            }
        },
        {
            name: 'exp_geo_coords_s',
            label: 'Longitudes',
            quoted: true,
            filter: function (coord) {
                var longitude = coord.split(',')[1];
                return longitude
            }
        },
        {
            name: 'exp_geolocations_ss',
            label: 'Locations',
            quoted: true
        },
        {
            name: 'exp_citations_ss',
            label: 'Citations',
            quoted: true
        },
        {
            name: 'exp_tags_ss',
            label: 'Tag',
            quoted: true
        },
        {
            name: 'exp_attractants_ss',
            label: 'Attractants',
            quoted: true
        },
        {
            name: 'exp_licenses_ss',
            label: 'Usage license',
            quoted: true
        },
        {
            name: 'exp_sex_s',
            label: 'Sex',
            quoted: false
        },
        {
            name: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            quoted: true
        },
        //DKDK VB-8459 add signposts_ss for Export
        {
            name: 'exp_signposts_ss',
            label: 'Available data types',
            quoted: true
        },
        //DKDK VB-8663 add geolocation_provenance_s & geolocation_precision_s for Export
        {
            name: 'exp_geolocation_provenance_s',
            label: 'Geolocation provenance',
            quoted: true
        },
        {
            name: 'exp_geolocation_precision_s',
            label: 'Geolocation precision',
            quoted: true
        }
    ],
    abnd: [
        {
            name: 'exp_sample_id_s',
            label: 'Sample ID',
            quoted: false
        },
        {
            name: 'exp_bundle_name_s',
            label: 'Record type',
            quoted: false
        },
        {
            name: 'exp_species_s',
            label: 'Species',
            quoted: false
        },
        {
            name: 'exp_sample_type_s',
            label: 'Sample type',
            quoted: false
        },
        {
            name: 'exp_label_s',
            label: 'Label',
            quoted: true
        },
        {
            name: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            quoted: false
        },
        {
            name: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            quoted: true,
            filter: function (dates) {
                var newDates = [];
                for (var i = 0, len = dates.length; i < len; i++) {
                    // console.dir(dates[i])
                    newDates.push(dates[i].replace(/[\[\]]/g, ''));
                }
                return newDates
            }
        },
        {
            name: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            quoted: true
        },
        {
            name: 'exp_projects_ss',
            label: 'Projects',
            quoted: true
        },
        //DKDK VB-8369 separating Coordinates into Lat & Long
        {
            name: 'exp_geo_coords_s',
            label: 'Latitudes',
            quoted: true,
            filter: function (coord) {
                var latitude = coord.split(',')[0];
                return latitude
            }
        },
        {
            name: 'exp_geo_coords_s',
            label: 'Longitudes',
            quoted: true,
            filter: function (coord) {
                var longitude = coord.split(',')[1];
                return longitude
            }
        },
        {
            name: 'exp_geolocations_ss',
            label: 'Locations',
            quoted: true
        },
        {
            name: 'exp_sample_size_i',
            label: 'Specimens collected',
            quoted: false
        },
        {
            name: 'exp_collection_duration_days_i',
            label: 'Collection duration (days)',
            quoted: false
        },
        {
            name: 'exp_citations_ss',
            label: 'Citations',
            quoted: true
        },
        {
            name: 'exp_tags_ss',
            label: 'Tag',
            quoted: true
        },
        {
            name: 'exp_attractants_ss',
            label: 'Attractants',
            quoted: true
        },
        {
            name: 'exp_licenses_ss',
            label: 'Usage license',
            quoted: true
        },
        {
            name: 'exp_sex_s',
            label: 'Sex',
            quoted: false
        },
        {
            name: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            quoted: true
        },
        //DKDK VB-8663 add geolocation_provenance_s & geolocation_precision_s for Export
        {
            name: 'exp_geolocation_provenance_s',
            label: 'Geolocation provenance',
            quoted: true
        },
        {
            name: 'exp_geolocation_precision_s',
            label: 'Geolocation precision',
            quoted: true
        }
    ],
    geno: [
        {
            name: 'exp_sample_id_s',
            label: 'Sample ID',
            quoted: false
        },
        {
            name: 'exp_description_s',
            label: 'Description',
            quoted: false
        },
        {
            name: 'exp_bundle_name_s',
            label: 'Record type',
            quoted: false
        },
        {
            name: 'exp_species_s',
            label: 'Species',
            quoted: false
        },
        {
            name: 'exp_sample_type_s',
            label: 'Sample type',
            quoted: false
        },
        {
            name: 'exp_label_s',
            label: 'Label',
            quoted: true
        },
        {
            name: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            quoted: false
        },
        {
            name: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            quoted: true,
            filter: function (dates) {
                var newDates = [];
                for (var i = 0, len = dates.length; i < len; i++) {
                    // console.dir(dates[i])
                    newDates.push(dates[i].replace(/[\[\]]/g, ''));
                }
                return newDates
            }
        },
        {
            name: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            quoted: true
        },
        {
            name: 'exp_projects_ss',
            label: 'Projects',
            quoted: true
        },
        //DKDK VB-8369 separating Coordinates into Lat & Long
        {
            name: 'exp_geo_coords_s',
            label: 'Latitudes',
            quoted: true,
            filter: function (coord) {
                var latitude = coord.split(',')[0];
                return latitude
            }
        },
        {
            name: 'exp_geo_coords_s',
            label: 'Longitudes',
            quoted: true,
            filter: function (coord) {
                var longitude = coord.split(',')[1];
                return longitude
            }
        },
        {
            name: 'exp_geolocations_ss',
            label: 'Locations',
            quoted: true
        },
        {
            name: 'exp_sample_size_i',
            label: 'Specimens collected',
            quoted: false
        },
        {
            name: 'exp_assay_id_s',
            label: 'Assay Id',
            quoted: false
        },
        {
            name: 'exp_protocols_ss',
            label: 'Protocols',
            quoted: true
        },
        {
            name: 'exp_phenotypes_ss',
            label: 'Phenotypes',
            quoted: true
        },
        {
            name: 'exp_genotype_type_s',
            label: 'Genotype Type',
            quoted: false
        },
        {
            name: 'exp_genotype_name_s',
            label: 'Genotype Name',
            quoted: false
        },
        {
            name: 'exp_genotype_inverted_allele_count_i',
            label: 'Inverted Allele Count',
            quoted: false
        },
        {
            name: 'exp_genotype_microsatellite_length_i',
            label: 'Microsatellite Length',
            quoted: false
        },
        {
            name: 'exp_genotype_mutated_protein_value_f',
            label: 'Mutated Protein Value',
            quoted: false
        },
        {
            name: 'exp_citations_ss',
            label: 'Citations',
            quoted: true
        },
        {
            name: 'exp_tags_ss',
            label: 'Tag',
            quoted: true
        },
        {
            name: 'exp_attractants_ss',
            label: 'Attractants',
            quoted: true
        },
        {
            name: 'exp_licenses_ss',
            label: 'Usage license',
            quoted: true
        },
        {
            name: 'exp_sex_s',
            label: 'Sex',
            quoted: false
        },
        {
            name: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            quoted: true
        },
        //DKDK VB-8663 add geolocation_provenance_s & geolocation_precision_s for Export
        {
            name: 'exp_geolocation_provenance_s',
            label: 'Geolocation provenance',
            quoted: true
        },
        {
            name: 'exp_geolocation_precision_s',
            label: 'Geolocation precision',
            quoted: true
        }
    ],
    path: [
        {
            name: 'exp_sample_id_s',
            label: 'Sample ID',
            quoted: false
        },
        //DKDK VB-7133 sample label
        {
            name: 'exp_sample_name_s',
            label: 'Sample label',
            quoted: true
        },
        {
            name: 'exp_assay_id_s',
            label: 'Assay ID',
            quoted: false
        },
        {
            name: 'exp_bundle_name_s',
            label: 'Record type',
            quoted: false
        },
        {
            name: 'exp_species_s',
            label: 'Species',
            quoted: false
        },
        {
            name: 'exp_sample_type_s',
            label: 'Sample type',
            quoted: false
        },
        {
            name: 'exp_sample_size_i',
            label: 'Sample size',
            quoted: false
        },
        {
            name: 'exp_label_s',
            label: 'Label',
            quoted: true
        },
        {
            name: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            quoted: false
        },
        {
            name: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            quoted: true,
            filter: function (dates) {
                var newDates = [];
                for (var i = 0, len = dates.length; i < len; i++) {
                    // console.dir(dates[i])
                    newDates.push(dates[i].replace(/[\[\]]/g, ''));
                }
                return newDates
            }
        },
        {
            name: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            quoted: true
        },
        {
            name: 'exp_projects_ss',
            label: 'Projects',
            quoted: true
        },
        //DKDK VB-8369 separating Coordinates into Lat & Long
        {
            name: 'exp_geo_coords_s',
            label: 'Latitudes',
            quoted: true,
            filter: function (coord) {
                var latitude = coord.split(',')[0];
                return latitude
            }
        },
        {
            name: 'exp_geo_coords_s',
            label: 'Longitudes',
            quoted: true,
            filter: function (coord) {
                var longitude = coord.split(',')[1];
                return longitude
            }
        },
        {
            name: 'exp_geolocations_ss',
            label: 'Locations',
            quoted: true
        },
        {
            name: 'exp_phenotype_type_s',
            label: 'Phenotype type',
            quoted: false
        },
        {
            name: 'exp_protocols_ss',
            label: 'Protocols',
            quoted: true
        },
        {
            name: 'exp_phenotype_value_f',
            label: 'Phenotype value',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_unit_s',
            label: 'Phenotype value unit',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_type_s',
            label: 'Phenotype value type',
            quoted: false
        },
        {
            name: 'exp_infection_source_s',
            label: 'Pathogen',
            quoted: false
        },
        {
            name: 'exp_infection_status_s',
            label: 'Infection status',
            quoted: false
        },
        {
            name: 'exp_citations_ss',
            label: 'Citations',
            quoted: true
        },
        {
            name: 'exp_tags_ss',
            label: 'Tag',
            quoted: true
        },
        {
            name: 'exp_attractants_ss',
            label: 'Attractants',
            quoted: true
        },
        {
            name: 'exp_licenses_ss',
            label: 'Usage license',
            quoted: true
        },
        {
            name: 'exp_sex_s',
            label: 'Sex',
            quoted: false
        },
        {
            name: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            quoted: true
        },
        //DKDK VB-8663 add geolocation_provenance_s & geolocation_precision_s for Export
        {
            name: 'exp_geolocation_provenance_s',
            label: 'Geolocation provenance',
            quoted: true
        },
        {
            name: 'exp_geolocation_precision_s',
            label: 'Geolocation precision',
            quoted: true
        }
    ],
    meal: [
        {
            name: 'exp_sample_id_s',
            label: 'Sample ID',
            quoted: false
        },
        {
            name: 'exp_assay_id_s',
            label: 'Assay ID',
            quoted: false
        },
        {
            name: 'exp_bundle_name_s',
            label: 'Record type',
            quoted: false
        },
        {
            name: 'exp_species_s',
            label: 'Species',
            quoted: false
        },
        {
            name: 'exp_sample_type_s',
            label: 'Sample type',
            quoted: false
        },
        {
            name: 'exp_sample_size_i',
            label: 'Sample size',
            quoted: false
        },
        {
            name: 'exp_label_s',
            label: 'Label',
            quoted: true
        },
        {
            name: 'exp_collection_assay_id_s',
            label: 'Collection ID',
            quoted: false
        },
        {
            name: 'exp_collection_date_range_ss',
            label: 'Collection date range',
            quoted: true,
            filter: function (dates) {
                var newDates = [];
                for (var i = 0, len = dates.length; i < len; i++) {
                    // console.dir(dates[i])
                    newDates.push(dates[i].replace(/[\[\]]/g, ''));
                }
                return newDates
            }
        },
        {
            name: 'exp_collection_protocols_ss',
            label: 'Collection protocols',
            quoted: true
        },
        {
            name: 'exp_projects_ss',
            label: 'Projects',
            quoted: true
        },
        //DKDK VB-8369 separating Coordinates into Lat & Long
        {
            name: 'exp_geo_coords_s',
            label: 'Latitudes',
            quoted: true,
            filter: function (coord) {
                var latitude = coord.split(',')[0];
                return latitude
            }
        },
        {
            name: 'exp_geo_coords_s',
            label: 'Longitudes',
            quoted: true,
            filter: function (coord) {
                var longitude = coord.split(',')[1];
                return longitude
            }
        },
        {
            name: 'exp_geolocations_ss',
            label: 'Locations',
            quoted: true
        },
        {
            name: 'exp_phenotype_type_s',
            label: 'Phenotype type',
            quoted: false
        },
        {
            name: 'exp_protocols_ss',
            label: 'Protocols',
            quoted: true
        },
        {
            name: 'exp_phenotype_value_f',
            label: 'Phenotype value',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_unit_s',
            label: 'Phenotype value unit',
            quoted: false
        },
        {
            name: 'exp_phenotype_value_type_s',
            label: 'Phenotype value type',
            quoted: false
        },
        {
            name: 'exp_blood_meal_source_s',
            label: 'Blood meal host',
            quoted: false
        },
        {
            name: 'exp_citations_ss',
            label: 'Citations',
            quoted: true
        },
        {
            name: 'exp_tags_ss',
            label: 'Tag',
            quoted: true
        },
        {
            name: 'exp_attractants_ss',
            label: 'Attractants',
            quoted: true
        },
        {
            name: 'exp_licenses_ss',
            label: 'Usage license',
            quoted: true
        },
        {
            name: 'exp_sex_s',
            label: 'Sex',
            quoted: false
        },
        {
            name: 'exp_dev_stages_ss',
            label: 'Developmental stage',
            quoted: true
        },
        //DKDK VB-8663 add geolocation_provenance_s & geolocation_precision_s for Export
        {
            name: 'exp_geolocation_provenance_s',
            label: 'Geolocation provenance',
            quoted: true
        },
        {
            name: 'exp_geolocation_precision_s',
            label: 'Geolocation precision',
            quoted: true
        }
    ],
};
