///////////////////////
// USER INPUT INFORM //
///////////////////////

// If you want to create a copy only for SAHEL: set filter_models = true & system_filter = ["INFORM_SAH"];
var filter_models = false;
var system_filter = []; //["INFORM_ESAF", "INFORM_GTM", "INFORM_LAC", "INFORM_LBN", "INFORM_SAH", "INFORM_CCA", "INFORM_COL"];

// Also needed (for the parameter-specific URL) is the exact base-path of the dashboard page.
var dashboard_pagename = 'Dashboard-Test';
var dashboard_location = 'http://www.inform-index.org/' + dashboard_pagename; 
var prototype_location = 'https://rodekruis.github.io/INFORM_dashboard_prototype/';
 
var setting = 'prototype'; //'prototype','api'  //Setting used during development to quickly switch to Github-page settings (using hardcopy .json-files)

//////////////////////
// DEFINE VARIABLES //
//////////////////////

//Important settings
var api_base = 'http://www.inform-index.org/API/InformAPI/';    //API basepath. Adapt if this ever changes.
var topojson_path = 'http://www.inform-index.org/DesktopModules/MVC/InformMVC/Model/';
var img_path = setting == 'api'? topojson_path + 'img/' : 'img/';
var url_global = 'http://www.inform-index.org/Results/Global';
var inform_levels = 10;                                         //Hierarchy levels used in INFORM models. 10 is robust as it is much more than the current maximum of 6 needed in the most extensive model (global model. If this should every increase, there are multiple occurences in the code that need to be updated.
var metric = 'INFORM';                                          //Default metric
var groups = ['INFORM','HA','VU','CC','HA.HUM','HA.NAT','VU.SEV','VU.VGR','CC.INF','CC.INS'];   //The indicators up to level 2 are assumed constant across models (e.g. for picture-icons). However, if an unknown indicator appears (like CC.FES in East Africa, the parent is automatically used.)

//Declare empty variables
var chart_show = 'map';
var inform_model;
var workflow_id;
var map_filters = [];
var row_filters = [];
var map;

//Function to start loading spinner
spinner_start = function() {
	var target = document.getElementById('spinner')
	spinner = new Spinner({length: 28, width:14}).spin(target);
}
//Function to stop loading spinner
spinner_stop = function() {
	spinner.stop();
}

//Load image-paths
$('#inform_logo-png').attr('src',img_path + 'inform_logo.png');
$('#icon-download-options-svg').attr('src',img_path + 'icon-download-options.svg');
$('#model-svg').attr('src',img_path + 'model.svg');
$('#INFORM-png').attr('src',img_path + 'INFORM.png');
$('#HA-png').attr('src',img_path + 'HA.png');
$('#VU-png').attr('src',img_path + 'VU.png');
$('#CC-png').attr('src',img_path + 'CC.png');

//////////////////////////////////////
// FUNCTION TO INITIALIZE DASHBOARD //
//////////////////////////////////////

var first_load = true;      //Added, such that Internet Explorer warning does not appear upon every model-load.
load_dashboard = function(inform_model,workflow_id) {

	spinner_start();
    
    //Load the map-view by default
    $('#map-chart').show();
	chart_show = 'map';
    document.getElementsByClassName('sidebar-wrapper')[0].setAttribute('style','');     //Fix needed in case of switching models while sidebar collapsed

	//Determine if a parameter-specific URL was entered, and IF SO, set the desired parameters
	var url = location.href;
	if (url.indexOf('?') > -1) {
        url = url.split('?')[1];
        console.log(url);
		if (url.split('&')[0].split('=')[0] == 'filter_models') {
            filter_models = url.split('&')[0].split('=')[1];
            console.log(filter_models);
            system_filter = url.split('&')[1].split('=')[1].split(',');
            console.log(system_filter);
            directURLload = false;
            window.history.pushState({}, document.title, setting == 'api' ? dashboard_location : prototype_location);
        } else {
            directURLload = true;
            inform_model = url.split('&')[0].split('=')[1];
            workflow_id = url.split('&')[1].split('=')[1];
            metric = url.split('&')[2].split('=')[1];
            chart_show = url.split('&')[3].split('=')[1];
            window.history.pushState({}, document.title, setting == 'api' ? dashboard_location : prototype_location);
        }
	} else {
		directURLload = false;
	}

	//Start loading data
	d = {};
	d.inform_model = inform_model;
	d.workflow_id = workflow_id;
    
    //0. Load default workflow
    var default_api = api_base + 'workflows/Default';
    d3.json(setting == 'api' ? default_api : 'data/default_workflow.json',function(default_workflow) {
        if (!workflow_id) {d.workflow_id = default_workflow.WorkflowId;}
        if (!workflow_id) {d.inform_model = default_workflow.WorkflowGroupName;}
        d.system = default_workflow.System;
        
        if (setting == 'prototype'){
            if (d.inform_model == 'INFORM_EAST_AFRICA') {
                d.system = 'INFORM_ESAF';
            } else if (d.inform_model == 'INFORM_SAHEL') {
                d.system = 'INFORM_SAH';
            } else if (d.inform_model.indexOf('_') > -1) {
                d.system = d.inform_model;
            } else {
                d.system = 'INFORM';
            } 
        }
        
        //1. Load the workflows related to inform_model/workflowgroupname
        var workflow_api = api_base + 'workflows/GetByWorkflowGroup/' + d.inform_model;
        d3.json(setting == 'api' ? workflow_api : 'data/workflow_' + d.system + '.json',function(workflow_info) {
            
            // Loop through the different workflows to get the right one (by workflow_id)
            for (i=0;i<workflow_info.length;i++){
                if (workflow_info[i].WorkflowId == d.workflow_id) {
                    d.system = workflow_info[i].System.toUpperCase();
                    d.geo_filename = workflow_info[i].GeometryFilename.replace('.json','');
                    d.workflow_name = workflow_info[i].Name;
                }
            }
            //if (d.system == 'INFORM') { country_code = 'INFORM'; } else { country_code = d.inform_model.replace('INFORM_',''); };

            //2. Get source-indicators for metadata
            var source_api = api_base + 'Indicators/Index/';
            d3.json(setting == 'api' ? source_api : 'data/sourcedata.json',function(source_data) {
                d.source_data = source_data;

                //3. Get the indicator-framework for this model
                var url_meta = api_base + 'Processes/GetByWorkflowId/' + d.workflow_id;
                d3.json(setting == 'api' ? url_meta : 'data/metadata_' + d.system + '.json', function(meta_data) {
                    d.Metadata = meta_data;
                    inform_indicators = [];
                    for (i=0;i<d.Metadata.length;i++) { inform_indicators.push(d.Metadata[i].OutputIndicatorName); }

                    //From indicator framework, derive which indicators to call for in the data-call
                    //var url_data = api_base + 'countries/Scores/?WorkflowId=' + workflow_id + '&IndicatorId=' + inform_indicators.toString();
                    var url_data = api_base + 'countries/Scores/?WorkflowId=' + d.workflow_id;

                    //4. Load INFORM data
                    d3.json(setting == 'api' ? url_data : 'data/inform_data_' + d.system + '.json', function(inform_data){
                        d.inform_data = $.grep(inform_data, function(e){ return inform_indicators.indexOf(e.IndicatorId) > -1;});

                        //5. Load Geo-data
                        var url_geo_direct = topojson_path + d.geo_filename + '.json';
                        d3.json(setting == 'api' ? url_geo_direct : 'data/' + d.geo_filename + '.json', function(geo_data) {
                            d.Districts = topojson.feature(geo_data,geo_data.objects[d.geo_filename]);
                            
                            //5a. Load Geo-boundary data
                            var geo_lines = 'INFORM_lines';
                            d3.json(setting == 'api' ? topojson_path + geo_lines + '.json' : 'data/INFORM_lines.json',function(border_data){
                                if (d.system == 'INFORM') { d.borders = topojson.feature(border_data,border_data.objects[geo_lines]); };
                                
                                //6. Load color-data
                                var url_color = api_base + 'Processes/GetColorPaletteByWorkflowId/' + d.workflow_id;
                                d3.json(setting == 'api' ? url_color : 'data/colors.json', function(color_data) {
                                    d.Colors = $.grep(color_data, function(e){ return e.ValueFrom !== e.ValueTo; });
                                    d.default_color = $.grep(d.Colors, function(e) { return e.OutputIndicatorName == 'INFORM' && e.Ordinal == 4;});

                                    //Print data to screen (for development/debug purposes)
                                    //console.log(d);

                                    //RESET default settings (after switching to a different models)
                                    if (!directURLload) {metric = 'INFORM';};
                                    document.getElementById('metric_label').firstChild.innerHTML = 'INFORM Risk Index';
                                    document.getElementById('indicator-button').style.backgroundColor = d.default_color;
                                    document.getElementById('area_selection').style.color = d.default_color;
                                    document.getElementsByClassName('reset-button')[0].style.backgroundColor = d.default_color;
                                    document.getElementsByClassName('reset-button')[1].style.backgroundColor = d.default_color;
                                    document.getElementsByClassName('reset-button')[0].style.visibility = 'hidden';
                                    document.getElementsByClassName('reset-button')[1].style.visibility = 'hidden';
                                    document.getElementById('model-title').innerHTML = d.workflow_name;
                                    for (var i=0;i<$('.level1.in').length;i++){ $('.level1.in')[i].classList.remove('in');};
                                    for (var i=0;i<$('.collapse.in').length;i++){ $('.collapse.in')[i].classList.remove('in');};
                                    
                                    // Main function to generate all content (see below)
                                    generateCharts(d);
                                    
                                    spinner_stop();

                                    //Check if browser is Internet Explorer and if this is the initial load. If so: display a warning.
                                    if (typeof L_PREFER_CANVAS !== 'undefined' && first_load == true) {
                                        $('#IEmodal').modal('show');
                                    }
                                    first_load = false;
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

//Load the dashboard
load_dashboard(inform_model,workflow_id);



///////////////////////////////////////////
// MAIN FUNCTION TO GENERATE ALL CONTENT //
///////////////////////////////////////////

var generateCharts = function (d){
    
    //////////////////////////
	// SET UP LOOKUP TABLES //
	//////////////////////////

	// fill a lookup table which finds the area name with the area code
	var genLookup = function (field){
		var lookup = {};
		d.Districts.features.forEach(function(e){
			lookup[e.properties.id] = String(e.properties[field]);
		});
		return lookup;
	};
	// fill a lookup table with the metadata-information per variable
	var genLookup_meta = function (d,field){
		var lookup_meta = {};
		d.Metadata.forEach(function(e){
			lookup_meta[e.OutputIndicatorName] = String(e[field]);
		});
		return lookup_meta;
	};

    var lookup = genLookup('name');
	var meta_label = genLookup_meta(d,'Fullname');
	var meta_level = genLookup_meta(d,'VisibilityLevel');
	var lookup_metafull_id = genLookup_meta(d,'IndicatorId');
	metric_label = meta_label[metric];
	document.getElementById('metric_label').firstChild.innerHTML = metric_label;
    var dec1Format = d3.format(',.1f');


	////////////////////
	// METADATA SETUP //
	////////////////////
    
    // Here we define the full indicator-structure of children and parents. Used for determining the indicator-structure in the sidebar, and for retrieving metadata-information.
    var children = [];
	for (var i=0; i < d.Metadata.length; i++) {

		var record = {};
		if (d.Metadata[i].OutputIndicatorName !== 'POP' && d.Metadata[i].OutputIndicatorName !== 'POP_DEN') {   //NOTE: 'POP' and 'POP_DEN' are left out, because assumed to generic to list for all normalized indicator they are used in.
			record.stepnr = d.Metadata[i].StepNumber;
			record.vis_level = d.Metadata[i].VisibilityLevel;
			record.name = d.Metadata[i].OutputIndicatorName;
			record.parent1 = d.Metadata[i].Parent;
			children.push(record);
		}
	};

	//fill the lookup table with the metadata-information per variable
	var genLookup_children = function (field){
		var test = {};
		children.forEach(function(e){
			test[e.name] = String(e[field]);
		});
		return test;
	};
	var lookup_children_parent = genLookup_children('parent1');
	var lookup_children_vis_level = genLookup_children('vis_level');

	for (var i=0;i<children.length;i++) {
        
        //For each indicators, find also the grandparents (etc.)
        children[i].parent2 = lookup_children_parent[children[i].parent1] == 'null' ? undefined : lookup_children_parent[children[i].parent1];
		children[i].parent3 = lookup_children_parent[children[i].parent2] == 'null' ? undefined : lookup_children_parent[children[i].parent2];
		children[i].parent4 = lookup_children_parent[children[i].parent3] == 'null' ? undefined : lookup_children_parent[children[i].parent3];
		children[i].parent5 = lookup_children_parent[children[i].parent4] == 'null' ? undefined : lookup_children_parent[children[i].parent4];
		children[i].parent6 = lookup_children_parent[children[i].parent5] == 'null' ? undefined : lookup_children_parent[children[i].parent5];
		children[i].parent7 = lookup_children_parent[children[i].parent6] == 'null' ? undefined : lookup_children_parent[children[i].parent6];
		children[i].parent8 = lookup_children_parent[children[i].parent7] == 'null' ? undefined : lookup_children_parent[children[i].parent7];
		children[i].parent9 = lookup_children_parent[children[i].parent8] == 'null' ? undefined : lookup_children_parent[children[i].parent8];
		children[i].parent10 = lookup_children_parent[children[i].parent9] == 'null' ? undefined : lookup_children_parent[children[i].parent9];
        
        //If there is a >99-indicator in between (like HA.NAT-TEMP) skip it
		children[i].parent1 = lookup_children_vis_level[children[i].parent1] > 99 ? lookup_children_parent[children[i].parent1] : children[i].parent1;
		children[i].parent2 = lookup_children_vis_level[children[i].parent2] > 99 ? lookup_children_parent[children[i].parent2] : children[i].parent2;
		children[i].parent3 = lookup_children_vis_level[children[i].parent3] > 99 ? lookup_children_parent[children[i].parent3] : children[i].parent3;
		children[i].parent4 = lookup_children_vis_level[children[i].parent4] > 99 ? lookup_children_parent[children[i].parent4] : children[i].parent4;
		children[i].parent5 = lookup_children_vis_level[children[i].parent5] > 99 ? lookup_children_parent[children[i].parent5] : children[i].parent5;
		children[i].parent6 = lookup_children_vis_level[children[i].parent6] > 99 ? lookup_children_parent[children[i].parent6] : children[i].parent6;
		children[i].parent7 = lookup_children_vis_level[children[i].parent7] > 99 ? lookup_children_parent[children[i].parent7] : children[i].parent7;
		children[i].parent8 = lookup_children_vis_level[children[i].parent8] > 99 ? lookup_children_parent[children[i].parent8] : children[i].parent8;
		children[i].parent9 = lookup_children_vis_level[children[i].parent9] > 99 ? lookup_children_parent[children[i].parent9] : children[i].parent9;
		children[i].parent10 = lookup_children_vis_level[children[i].parent10] > 99 ? lookup_children_parent[children[i].parent10] : children[i].parent10;
        
        //Concatenate all parents into array
		children[i].parents = children[i].name + ',' + (children[i].parent1 ? children[i].parent1 + ',' : '') + (children[i].parent2 ? children[i].parent2 + ',' : '') + (children[i].parent3 ? children[i].parent3 + ',' : '') + (children[i].parent4 ? children[i].parent4 + ',' : '') + (children[i].parent5 ? children[i].parent5 + ',' : '')
									 + (children[i].parent6 ? children[i].parent6 + ',' : '') + (children[i].parent7 ? children[i].parent7 + ',' : '') + (children[i].parent8 ? children[i].parent8 + ',' : '') + (children[i].parent9 ? children[i].parent9 + ',' : '') + (children[i].parent10 ? children[i].parent10 + ',' : '');
		children[i].parents = children[i].parents.split(',');
		if (children[i].parents.indexOf('') > -1) { children[i].parents.splice(children[i].parents.indexOf(''), 1); };
		children[i].parents = children[i].parents.filter(function(item, i, ar){ return ar.indexOf(item) === i; });

		//For each indicator search if it's found in the available source-data index. By setting it up like this, all metadata that is found anywhere down the chain of indicator can be bound to it.
        children[i].levels = children[i].parents.length;
		for (k=0;k<d.source_data.length;k++) {
			if (children[i].name == d.source_data[k].IndicatorId || lookup_metafull_id[children[i].name] == d.source_data[k].IndicatorId) {
				children[i].indicator = d.source_data[k].IndicatorId;
				children[i].indicator_label = d.source_data[k].IndicatorDescription;
				children[i].provider = d.source_data[k].Provider;
				children[i].link = d.source_data[k].Link;
				children[i].description = d.source_data[k].IndicatorNote;
			}
		}
    }
    // for (var m=0;m<children.length;m++){
        // if (children[m].vis_level >= 99) {
            // children.splice(m,1);
        // };
    // };
    //INSPECT RESULT
	//console.log(children);

	var max_stepnr = Math.max.apply(Math,d.Metadata.map(function(o){return o.StepNumber;}));
	
    //Here we fill the tables-array with all indicators that will be shown in the dashboard.
    tables = [];
	for (var i=0; i < d.Metadata.length; i++) {

		var record = {};
		var record_temp = d.Metadata[i];

		//Before the DataType-tag (0/1) was introduced in the API, the below business-rules were used to recognize normalized (0-10) indicators.
        //Check per indicator the MIN and MAX to determine if we're dealing with a normalized (0-10) indicator
		var ind_data = $.grep(d.inform_data, function(e) {return e.IndicatorId == record_temp.OutputIndicatorName;});
		var ind_max = Math.max.apply(Math,ind_data.map(function(o){return o.IndicatorScore;}));
		var ind_min = Math.min.apply(Math,ind_data.map(function(o){return o.IndicatorScore;}));
		if (
            ((setting == 'api' && record_temp.DataType == 1)                   //This is the NEWLY ADDED way to recognize normalized indicators
            || (setting == 'prototype'
                //OLD CONDITIONS USED
                && ind_max <=10 							//Obvious
                && (ind_min >= 0 || ind_min == -99) 	    // > 0 is obvious. ==-99 is a code that occurs
                && ind_max > 1.1						    //This is to rule out 0-1 indicators (such as HDI or percentages)
                && (record_temp.Parent || record_temp.OutputIndicatorName == 'INFORM')   //the indicator should have a parent (unless it is the INFORM-indicator itself)
			))
            && record_temp.VisibilityLevel < 99         //In both OLD and NEW approach, these indicators are filtered out here.
			) {
			record.name = record_temp.OutputIndicatorName;
			record.lowest_level = 0;

            //Based on the children-object above, we determine the CHILDREN, the LEVEL and the GROUP (=parent) of each indicator.
			record.children = [];
            for (m=0;m<children.length;m++){
                if (children[m].parent1 == record.name && children[m].vis_level < 99) {
                    record.children.push(children[m].name);
                }
            };
            for (m=0;m<children.length;m++){
				if (children[m].parents.indexOf(record_temp.OutputIndicatorName) > -1) {
                    record.level = children[m].levels - children[m].parents.indexOf(record_temp.OutputIndicatorName) - 1;
					record.group = children[m].parents[children[m].parents.indexOf(record_temp.OutputIndicatorName) + 1];
					break;
				}
			};
            tables.push(record);
		} else { // USE THIS FOR inspection of possibly weird variables
			// console.log(record_temp.OutputIndicatorName);
			// console.log(ind_max);
			// console.log(ind_min);
		}

	}
    //INSPECT RESULT
	//console.log(tables);
    
    
    //Here we retrieve the right metadata per indicator.
	
    // For each selected indicator ..
	tables.forEach(function(t) {
		t.indicator = [];
		t.indicator_label = [];
		t.provider = [];
		t.link = [];
		t.description = [];
        
		// if no children: this is a lowest-level indicator
		if (t.children.length == 0) {t.lowest_level = 1;};
        
		// .. and for each child of that indicator
		var match = 0;
		var match2 = 0;
		for (i=0;i<t.children.length;i++) {
			for (j=0;j<tables.length;j++) {
                
				// .. look up if the child is also in Tables-object (if so: it is not a lowest-level indicator)
				if (t.children[i] == tables[j].name) {
					match = 1;
				};
			};
            
			// .. if no match, this is a lowest-level indicator
			if (match == 0) {
				t.lowest_level = 1;

				//.. Now search in the previously-made children array for the child-indicator, if found take the metadata-info from it. 
				for (m=0;m<children.length;m++){
					if (children[m].parents.indexOf(t.children[i]) > -1 && children[m].indicator) {
						if (t.indicator.indexOf(children[m].indicator) <= -1) {
							t.indicator.push(children[m].indicator);
							t.indicator_label.push(children[m].indicator_label);
							t.provider.push(children[m].provider);
							t.link.push(children[m].link);
							t.description.push(children[m].description);
						}
						match2 = 1;
					}
				}
			};
		};
        
        // .. If no match found yet, also check for the indicator-name itself (instead of it's child)
		if (match2 == 0) {
			for (m=0;m<children.length;m++){
				if (children[m].parents.indexOf(t.name) > -1 && children[m].indicator) {
					if (t.indicator.indexOf(children[m].indicator) <= -1) {
						t.indicator.push(children[m].indicator);
						t.indicator_label.push(children[m].indicator_label);
						t.provider.push(children[m].provider);
						t.link.push(children[m].link);
						t.description.push(children[m].description);
					}
				}
			}
		}
	});
    //INSPECT RESULT
	//console.log(tables);
    
    //INSPECT RESULT: Check for lowest-level indicators, that have no metadata bound to it.
	tables.forEach(function(t) {
		if (t.lowest_level == 1 && t.indicator.length == 0) {
			//console.log(t);
		}
	});

	//fill the lookup table with the metadata-information per variable
	var genLookup_tables = function (field){
		var test = {};
		tables.forEach(function(e){
			test[e.name] = e[field];
		});
		return test;
	};
	var lookup_indicator = genLookup_tables('indicator');
	var lookup_indicator_label = genLookup_tables('indicator_label');
	var lookup_provider = genLookup_tables('provider');
	var lookup_link = genLookup_tables('link');
	var lookup_description = genLookup_tables('description');


	////////////////
	// DATA SETUP //
	////////////////

	//First PIVOT the INFORM data from row*indicator level to row level (with indicators als columns)
	var grouped = [];
	d.inform_data.forEach(function (a) {
		if (!this[a.Iso3]) {
			this[a.Iso3] = { pcode: a.Iso3, values: [] };
			grouped.push(this[a.Iso3]);
		}
		this[a.Iso3].values.push({ IndicatorId: a.IndicatorId, IndicatorScore: a.IndicatorScore });
	}, Object.create(null)); // Object.create creates an empty object without prototypes

	var data_final = [];
	for (var i=0; i < grouped.length; i++) {
		var record = {};
		var record_temp = grouped[i];
		record.pcode = record_temp.pcode;
		record.name = lookup[record_temp.pcode] ? lookup[record_temp.pcode] : '';
		for (var j=0; j < tables.length; j++) {
			count=0;
			for (var k=0;k<record_temp.values.length;k++) {
				var record_temp2 = record_temp.values[k];
				if (tables[j].name == record_temp2.IndicatorId) {
					record[tables[j].name] = record_temp2.IndicatorScore == 0 ? '0.01' : String(record_temp2.IndicatorScore);   //Replace 0 by 0.01 (to easily differentiate between real 0-values and crossfilter unselected 0-values). 0.01 will be rounded to 0 anyway when shown in the dashboard.
					count=1;
				}
			}
			if (count==0) {record[tables[j].name] = '';}

		}
		data_final[i] = record;
	}
    //INSPECT RESULT
	//console.log(data_final);

    // Start CROSSFILTER
	var cf = crossfilter(data_final);
	for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = 'All '; };

	// The wheredimension returns the unique identifier of the geo area
	var whereDimension = cf.dimension(function(d) { return d.pcode; });
	var whereDimension_tab = cf.dimension(function(d) { return d.pcode; });
	
    // Create the groups for these two dimensions (i.e. sum the metric)
	var whereGroupSum = whereDimension.group().reduceSum(function(d) {return d[metric];});
	var whereGroupSum_tab = whereDimension_tab.group().reduceSum(function(d) {return d[metric];});
    	
    
    ////////////////////////////
	// SET UP COLOR FUNCTIONS //
	////////////////////////////
    
    //Define the colors and thresholds for the selected indicator. To feed to the map/chart. It accepts the current metrics as input. It gives a full color-range + quantile-range as output.
	mapchartColors_func = function(metric) {
        
        //Define the color-group (i.e. the level-2 indicator-group - like VU.SEV) the indicator belongs to.
		var color_group = metric.split('.')[0].concat((metric.split('.')[1]) ? '.'.concat(metric.split('.')[1]) : '');
		if (groups.indexOf(color_group) <= -1) {
			color_group = color_group.split('.')[0];
		}
        
        //Derive the HEX-colors and thresholds from the color-API-call
		color_range = [];
		colors = [];
		for (j=0;j<d.Colors.length;j++) {
			if (d.Colors[j].OutputIndicatorName == color_group) {
				var record = {threshold: d.Colors[j].ValueTo, HEX: d.Colors[j].HEX};
				color_range.push(record);
				colors.push(d.Colors[j].HEX);
			}
		}
        
        //Sort them (to be sure)
		color_range.sort(function(a,b) {
			return parseFloat(a.threshold) - parseFloat(b.threshold);
		});
        
        //For lower-level indicators we use quintiles for color-thresholds. Therefore it needs to full the range of values (sorted).
		var quantile_range = [];
		for (i=0;i<data_final.length;i++) {
            if (data_final[i][metric]) {quantile_range.push(data_final[i][metric]);};
			quantile_range.sort();
		};
		return d3.scale.quantile()
				.domain(quantile_range)
				.range(colors);
	};
	mapchartColors = mapchartColors_func(metric);
	document.getElementById('indicator-button').style.backgroundColor = color_range[3].HEX;
	document.getElementsByClassName('reset-button')[0].style.backgroundColor = color_range[3].HEX;
	document.getElementsByClassName('reset-button')[1].style.backgroundColor = color_range[3].HEX;
	document.getElementById('area_selection').style.color = color_range[3].HEX;
    
    //We need a similar, but separate function to use for all the sidebar-bars (that show when selecting one country). It gives as output one specific color for one specific indicator.
	color_cat = function(ind) {
        
        //Color depends on the value (width) of each indicator
		var width = keyvalue[ind];
        
        //Again determine the color group
		var color_group = ind.split('.')[0].concat((ind.split('.')[1]) ? '.'.concat(ind.split('.')[1]) : '');
		if (groups.indexOf(color_group) <= -1) {
			color_group = color_group.split('.')[0];
		}
        
        //Retrieve the colors/thresholds from API-call
		color_ranges = [];
		for (j=0;j<d.Colors.length;j++) {
			if (d.Colors[j].OutputIndicatorName == color_group) {
				var record = {threshold: d.Colors[j].ValueTo, HEX: d.Colors[j].HEX};
				color_ranges.push(record);
			}
		}
        //Sort by threshold value
		color_ranges.sort(function(a,b) {
			return parseFloat(a.threshold) - parseFloat(b.threshold);
		});
        
        //Return the right color, based on the value
		if (isNaN(width)) {return '#ccc';}
		else if (width<=color_ranges[0].threshold) {return color_ranges[0].HEX;}
		else if (width<=color_ranges[1].threshold) {return color_ranges[1].HEX;}
		else if (width<=color_ranges[2].threshold) {return color_ranges[2].HEX;}
		else if (width<=color_ranges[3].threshold) {return color_ranges[3].HEX;}
		else if (width<=color_ranges[4].threshold) {return color_ranges[4].HEX;}
	};

    
    ////////////////////////////
	// SET UP COLOR FUNCTIONS //
	////////////////////////////
    
    //Create all level2 HTML (HA.NAT level etc.)
	var createHTML_level2 = function() {
        
        var risk_score = document.getElementById('risk_score_main');
		if (risk_score) {
			risk_score.textContent = '';
			risk_score.setAttribute('class','component-score');
			risk_score.setAttribute('style','border:none');
		}
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		if (vulnerability_score) {
			vulnerability_score.textContent = '';
			vulnerability_score.setAttribute('class','component-score');
			vulnerability_score.setAttribute('style','border:none');
		}
		var hazard_score = document.getElementById('hazard_score_main');
		if (hazard_score) {
			hazard_score.textContent = '';
			hazard_score.setAttribute('class','component-score');
			hazard_score.setAttribute('style','border:none');
		}
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (coping_score) {
			coping_score.textContent = '';
			coping_score.setAttribute('class','component-score');
			coping_score.setAttribute('style','border:none');
		}


		//Empty the existing HTML first (so that when switching models, the HTML doesn't duplicate)
		var INFORM = document.getElementById('INFORM');
		var VU = document.getElementById('VU');
		var HA = document.getElementById('HA');
		var CC = document.getElementById('CC');
		if (INFORM) {while (INFORM.firstChild) { INFORM.removeChild(INFORM.firstChild); };}
		if (VU) {while (VU.firstChild) { VU.removeChild(VU.firstChild); };}
		if (HA) {while (HA.firstChild) { HA.removeChild(HA.firstChild); };}
		if (CC) {while (CC.firstChild) { CC.removeChild(CC.firstChild); };}

        //Loop through all indicators in tables-object
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
            
            //Determine the right icon
			if (groups.indexOf(record.name.substring(0,6)) > -1) {
				icon = img_path + record.name.substring(0,6) + '.png';
			} else {
				icon = img_path + record.name.substring(0,2) + '.png';
			}
            
            //Only do this for level2-indicators (lower-level indicators have separate function below. While level 0 (INFORM) and 1 (HA,VU,CC) are hardcoded in HTML)
			if (record.level == 2) {

                var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header level2');
				var parent = document.getElementById(record.group)
				parent.appendChild(div_heading);
				var a_prev = document.createElement('a');
				a_prev.setAttribute('data-toggle','collapse');
				a_prev.setAttribute('href','#collapse'+record.name.split('.').join('-'));
				div_heading.appendChild(a_prev);
				var div_collapse = document.createElement('div');
				div_collapse.setAttribute('id','collapse'+record.name.split('.').join('-'));
				div_collapse.setAttribute('class','panel-collapse collapse level2');
				parent.appendChild(div_collapse);
				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				a_prev.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col-md-2 col-sm-2 col-xs-2');
				div.appendChild(div0);
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-4 col-sm-4 col-xs-4 component-label');
				div1.setAttribute('onclick','change_indicator(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				div.appendChild(div1);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5 col-sm-5 col-xs-5 bar-container');
				div.appendChild(div2);
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score-small');
				div1a.setAttribute('id',record.name);
				div2.appendChild(div1a);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar');
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:0%;border:none');
				div2a.appendChild(div2a1);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col-md-1 col-sm-1 col-xs-1 no-padding');
				div.appendChild(div3);
                if (record.lowest_level == 1) {
                    var button = document.createElement('button');
                    button.setAttribute('type','button');
                    button.setAttribute('class','btn-modal');
                    button.setAttribute('data-toggle','modal');
                    button.setAttribute('onclick','info(\'' + record.name + '\')');
                    div3.appendChild(button);
                    var div3a = document.createElement('div');
                    div3a.setAttribute('style','height:17px;width:auto');
                    button.appendChild(div3a);
                    var img3 = document.createElement('img');
                    img3.setAttribute('src',img_path + 'icon-popup.svg');
                    img3.setAttribute('style','height:100%');
                    div3a.appendChild(img3);
                }
            }
		}
	};
	createHTML_level2();
    
    //Similar function for level 3 indicators and below
	var createHTML_level3 = function(input_level) {

        //Define the grey-shades that are used for subsequent levels of the accordion opening up
		var grey_shades = ['#f0f0f0','#d9d9d9','#bdbdbd','#969696','#737373','#969696','#737373','#969696'];
		var background_color = grey_shades[input_level-3];
        
        //Loop through indicators ...
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];

			if (record.level == input_level) {

                var div_heading = document.createElement('div');
				div_heading.setAttribute('id','heading'+record.name.split('.').join('-'));
				div_heading.setAttribute('class','accordion-header level' + input_level);
                //INSPECT RESULT: can be handy if an error arises
				//console.log(record);
				var parent = document.getElementById('collapse'+record.group.split('.').join('-'))
                //Extra check to make sure the application does not break
				if (parent) {
					parent.appendChild(div_heading);
					var a_prev = document.createElement('a');
					a_prev.setAttribute('data-toggle','collapse');
					a_prev.setAttribute('href','#collapse'+record.name.split('.').join('-'));
					div_heading.appendChild(a_prev);
					var div_collapse = document.createElement('div');
					div_collapse.setAttribute('id','collapse'+record.name.split('.').join('-'));
					div_collapse.setAttribute('class','panel-collapse collapse level' + input_level);
					parent.appendChild(div_collapse);
					var div = document.createElement('div');
					div.setAttribute('class','component-section');
					div.setAttribute('style','background-color:' + background_color + '; color:black');
					var parent = document.getElementById('collapse'+record.group.split('.').join('-'));
					a_prev.appendChild(div);
					var div1 = document.createElement('div');
					div1.setAttribute('class','col-md-6 col-sm-6 col-xs-6  component-label');
					div1.setAttribute('style','padding-left: 5px');
					div1.setAttribute('onclick','change_indicator(\''+record.name+'\')');
					div1.innerHTML = meta_label[record.name];
					div.appendChild(div1);
					var div2 = document.createElement('div');
					div2.setAttribute('class','col-md-5 col-sm-5 col-xs-5 bar-container');
					div.appendChild(div2);
					var div1a = document.createElement('div');
					div1a.setAttribute('class','component-score-small');
					div1a.setAttribute('id',record.name);
					div2.appendChild(div1a);
					var div2a = document.createElement('div');
					div2a.setAttribute('class','component-scale');
					div2.appendChild(div2a);
					var div2a1 = document.createElement('div');
					div2a1.setAttribute('class','score-bar');
					div2a1.setAttribute('id','bar-'+record.name);
					div2a1.setAttribute('style','width:0%; border:none');
					div2a.appendChild(div2a1);
					var div3 = document.createElement('div');
					div3.setAttribute('class','col-md-1 col-sm-1 col-xs-1 no-padding');
					div.appendChild(div3);
					if (record.lowest_level == 1) {
                        var button = document.createElement('button');
                        button.setAttribute('type','button');
                        button.setAttribute('class','btn-modal');
                        button.setAttribute('data-toggle','modal');
                        button.setAttribute('onclick','info(\'' + record.name + '\')');
                        div3.appendChild(button);
                        var div3a = document.createElement('div');
                        div3a.setAttribute('style','height:17px;width:auto');
                        button.appendChild(div3a);
						var img3 = document.createElement('img');
						img3.setAttribute('src',img_path + 'icon-popup.svg');
						img3.setAttribute('style','height:100%');
						div3a.appendChild(img3);
					}
				}
			}
		}
	}
    
    //Create HTML for all levels
	createHTML_level3(3);
	createHTML_level3(4);
	createHTML_level3(5);
	createHTML_level3(6);
	createHTML_level3(7);
	createHTML_level3(8);
	createHTML_level3(9);
	createHTML_level3(10);

    
    //This is a function (used in updateHTML function) that retrieves the data for the selected area(s).
	var keyvalue = [];
	var keyvalues1 = function(filters) {

		var data_area = data_final.filter(function(obj) { return filters[0] == obj.pcode; });
		keyvalue = [];
		tables.forEach(function(t) {
			var key = t.name;
			keyvalue[key] = data_area[0][key];
		});
		return keyvalue;

	};
    
    //This function fill the sidebar-indicator-structure with values and color bar-charts (when selecting 1 area) or empties it again (when moving to multiple/all area-selection)
	var updateHTML = function(filters) {

		var risk_score = document.getElementById('risk_score_main');
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		var hazard_score = document.getElementById('hazard_score_main');
		var coping_score = document.getElementById('coping_capacity_score_main');
        
        //Fill the (white-backgrounded) values for the main-components (if one area selected) ..
		if (filters.length == 1) {
			keyvalue = keyvalues1(filters);

			if (risk_score) {
				risk_score.textContent = dec1Format(keyvalue.INFORM);
				risk_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = dec1Format(keyvalue.VU);
				vulnerability_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			if (hazard_score) {
				hazard_score.textContent = dec1Format(keyvalue.HA);
				hazard_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			if (coping_score) {
				coping_score.textContent = dec1Format(keyvalue.CC);
				coping_score.setAttribute('style','border:solid; border-width:1px; border-color:grey');
			}
			for (var i=0;i<$('.component-scale').length;i++){ $('.component-scale')[i].style.background = '#e2e7ee'; };

        // .. or empty them again (if multiple/all areas selected)
		} else {
			if (risk_score) {
				risk_score.textContent = '';
				risk_score.setAttribute('style','border:none');
			}
			if (vulnerability_score) {
				vulnerability_score.textContent = null;
				vulnerability_score.setAttribute('style','border:none');
			}
			if (hazard_score) {
				hazard_score.textContent = null;
				hazard_score.setAttribute('style','border:none');
			}
			if (coping_score) {
				coping_score.textContent = null;
				coping_score.setAttribute('style','border:none');
			}
			for (var i=0;i<$('.component-scale').length;i++){ $('.component-scale')[i].style.background = 'transparent'; };
		};
        
        //Loop through all lower-level indicators now
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];

			if (record.level >= 2) {
                
                // .. and fill the values and the bar-charts per indicator (if one area selected)
				if (filters.length == 1) {

					var width = keyvalue[record.name]*10;
					var div1a = document.getElementById(record.name);
					div1a.setAttribute('class','component-score-small');
					div1a.setAttribute('style','border:solid; border-width:1px; border-color:black');

					div1a.innerHTML = !keyvalue[record.name] ? '-' : (keyvalue[record.name] == 10 ? '10' : dec1Format(keyvalue[record.name]));
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');
					div2a1.setAttribute('style','width:'+ width + '%; background:' + color_cat(record.name));
                
                // .. or empty them again (if multiple/all areas selected)
				} else {

					var div1a = document.getElementById(record.name);
					div1a.innerHTML = '';
					div1a.setAttribute('style','border:none');
					var div2a1 = document.getElementById('bar-'+record.name);
					div2a1.setAttribute('class','score-bar ');
					div2a1.setAttribute('style','width:0%');


				}
			}
		}
	};




	/////////////////
	// CHART SETUP //
	/////////////////

	// Clear the charts
	dc.chartRegistry.clear();
	if (map !== undefined) { map.remove(); }
    //Define map/rowchart
	var mapChart = dc.leafletChoroplethChart('#map-chart');
	var rowChart = dc.rowChart('#row-chart');
    
    /////////////////////
	// MAP CHART SETUP //
	/////////////////////
    
    //This function recognizes a CTRL+click
	$(document).keydown(function(event){
		if(event.which=="17")
			cntrlIsPressed = true;
	});
	$(document).keyup(function(){
		cntrlIsPressed = false;
	});
	var cntrlIsPressed = false;     //default: CTRL not pressed
	var click_filter = true;        //Setting which determines if chart is manually filtered (by click) or by some other function
	var coming_from_map = false;    //Setting which determines if filter happens while coming from Map (moving to Tabular)
	var coming_from_tab = false;    //Setting which determines if filter happens while coming from Tabular (moving to Map)

	//Set up the map itself with all its properties
    mapChart
		.width($('#map-chart').width())
		.height(800)
		.dimension(whereDimension)
		.group(whereGroupSum)
		.center([0,0])
		.zoom(0)
		.geojson(d.Districts)
		.colors(mapchartColors)
		.colorCalculator(function(e){
            //For lower-level indicators quintiles are used for coloring (all information for which is stored in mapchartColors)
			if (meta_level[metric] > 3){ 
				if (!e) {return '#cccccc';} else {return mapChart.colors()(e);}
            //For higher-level indicator we use the thresholds stored in the created color_range object.
			} else {
				if (!e) {return '#cccccc';}
				else if (e<=color_range[0].threshold) {return color_range[0].HEX;}
				else if (e<=color_range[1].threshold) {return color_range[1].HEX;}
				else if (e<=color_range[2].threshold) {return color_range[2].HEX;}
				else if (e<=color_range[3].threshold) {return color_range[3].HEX;}
				else if (e<=color_range[4].threshold) {return color_range[4].HEX;}
			}
		})
		.featureKeyAccessor(function(feature){
			return feature.properties.id;
		})
		.popup(function(d){
			return lookup[d.key].concat(' - ',meta_label[metric],': ',isNaN(d.value) ? 'No Data' : dec1Format(d.value));
		})
		.renderPopup(true)
		.turnOnControls(true)
		.legend(dc.leafletLegend().position('topright'))

		//Set up what happens when clicking on the map (popup appearing mainly)
		.on('filtered',function(chart,filters){
            
            if (cntrlIsPressed) {
				for (i=0;i<row_filters_old.length;i++){ if (chart.filters().indexOf(row_filters_old[i]) <= -1) { chart.filters().push(row_filters_old[i]); }; };
			}
            //If NOT CTRL+click the previous selected area is removed from the filter (the default in this library is actuall that clicking ADDS an area to the selection)
			if(!cntrlIsPressed && click_filter) {
				while (chart.filters().length > 1) {chart.filters().shift();}
			}
			map_filters = $.extend( [], chart.filters() );
            
            //When coming from Tabular View: update all information accordingly.
			if (chart_show == 'map' && coming_from_tab) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (row_filters_old.length == 1) {$('.filter-count')[i].innerHTML = lookup[row_filters_old[0]];}
					else if (row_filters_old.length > 1) { $('.filter-count')[i].innerHTML = row_filters_old.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				updateHTML(row_filters_old);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (row_filters_old.length > 0) { resetbutton.style.visibility = 'visible';} else { resetbutton.style.visibility = 'hidden'; }
				var zoombutton = document.getElementsByClassName('reset-button')[1];
				if (row_filters_old.length > 0) { zoombutton.style.visibility = 'visible';} else { zoombutton.style.visibility = 'hidden'; }
			}
            //When NOT coming from Tabular View
			if (chart_show == 'map' && !coming_from_tab) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (map_filters.length == 1) {$('.filter-count')[i].innerHTML = lookup[map_filters[0]];}
					else if (map_filters.length > 1) { $('.filter-count')[i].innerHTML = map_filters.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				updateHTML(map_filters);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (map_filters.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
				var zoombutton = document.getElementsByClassName('reset-button')[1];
				if (map_filters.length > 0) { zoombutton.style.visibility = 'visible'; } else { zoombutton.style.visibility = 'hidden'; }
			}
		})
        .on('renderlet',function(chart,filters){
            if (polygon_layer) {
                if (d.system == 'INFORM') {
                    polygon_layer.setStyle({weight:0});
                } else {
                    polygon_layer.setStyle({weight:0.5});
                }
            }
            
        })
	;



	/////////////////////
	// ROW CHART SETUP //
	/////////////////////
    
    //Extra function needed to determine width of row-chart in various settings
    if($(window).width() < 768) {
        var rowChart_width = $('#tabular-wrapper').width();
    } else {
        var rowChart_width = $('#row-chart-container').width() - 370;
    }
    barheight = 20; //Height of one bar in Tabular View
	var row_filters_old = [];
	rowChart
        .width(rowChart_width)
		.height((barheight + 5) * data_final.length + 50)
		.dimension(whereDimension_tab)
		.group(whereGroupSum_tab)
		.ordering(function(d) {return isNaN(d.value) ? 0 : -d.value; })
		.fixedBarHeight(barheight)
		.valueAccessor(function(d){ return isNaN(d.value) ? 0 : d.value; })
		.colors(mapchartColors)
		.colorCalculator(function(e){
            //For lower-level indicators quintiles are used for coloring (all information for which is stored in mapchartColors)
			if (meta_level[metric] > 3) {
				if (!e) {return '#cccccc';} else {return mapChart.colors()(e.value);}
            //For higher-level indicator we use the thresholds stored in the created color_range object.
			} else {
				if (!e) {return '#cccccc';}
				else if (e.value<=color_range[0].threshold) {return color_range[0].HEX;}
				else if (e.value<=color_range[1].threshold) {return color_range[1].HEX;}
				else if (e.value<=color_range[2].threshold) {return color_range[2].HEX;}
				else if (e.value<=color_range[3].threshold) {return color_range[3].HEX;}
				else if (e.value<=color_range[4].threshold) {return color_range[4].HEX;}
			}
		})
		.label(function(d) {
			if (d.value == 0) {return '';} else {
				return lookup[d.key] ? (isNaN(d.value) ? "No Data" : dec1Format(d.value)).concat(' - ',lookup[d.key]) : dec1Format(d.value).concat(' - ',d.key);
			}
		})
		.title(function(d) {
			return lookup[d.key] ? (isNaN(d.value) ? "No Data" : dec1Format(d.value)).concat(' - ',lookup[d.key]) : dec1Format(d.value).concat(' - ',d.key);
		})
		.on('filtered',function(chart,filters){
            
            //If NOT CTRL+click the previous selected area is removed from the filter (the default in this library is actuall that clicking ADDS an area to the selection)
			if(!cntrlIsPressed && click_filter) {
				while (chart.filters().length > 1) {chart.filters().shift();}
			}
			row_filters = $.extend( [], chart.filters() );
            
            //If coming from map: update all sidebar-information accordingly
			if (chart_show == 'row' && coming_from_map) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (map_filters_old.length == 1) { $('.filter-count')[i].innerHTML = lookup[map_filters_old[0]]; }
					else if (map_filters_old.length > 1) { $('.filter-count')[i].innerHTML = map_filters_old.length; }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				updateHTML(map_filters_old);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (map_filters_old.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
			}
            //If not coming from map
			if (chart_show == 'row'  && !coming_from_map) {
				for (var i=0;i<$('.filter-count').length;i++){
					if (row_filters.length == 1  || row_filters_old.length == 1) { $('.filter-count')[i].innerHTML = row_filters.length == 0 ? lookup[row_filters_old[0]] : lookup[row_filters[0]]; }
					else if (row_filters.length > 1 || row_filters_old.length > 1) { $('.filter-count')[i].innerHTML = Math.max(row_filters.length,row_filters_old.length); }
					else { $('.filter-count')[i].innerHTML = 'All '; }
				};
				row_filters.length == 0 ? updateHTML(row_filters_old) : updateHTML(row_filters);
				var resetbutton = document.getElementsByClassName('reset-button')[0];
				if (row_filters.length > 0 || row_filters_old.length > 0) { resetbutton.style.visibility = 'visible'; } else { resetbutton.style.visibility = 'hidden'; }
			}
		})
        //Make sure the row-text function (determines black/white color of text in bar-chart) also works after filtering the row-chart
		.on('renderlet',function(chart,filters){
			row_text(color_range);
		})
		.elasticX(false)
		.x(d3.scale.linear().range([0,(rowChart.width())]).domain([0,11]))
		.xAxis().scale(rowChart.x()).tickValues([])
		;
    
    /////////////////////////
	// ROW CHART FUNCTIONS //
	/////////////////////////
    
    //Function to determine black/white color of text (to be best visible compared to background-color, etc.)
	row_text = function(color_range) {
        var color_level;
		for (var i=0;i<$('.dc-chart g.row').length;i++){
            row = $('.dc-chart g.row')[i];
            fill = row.getElementsByTagName('rect')[0].getAttribute('fill');
			selection = row.getElementsByTagName('rect')[0].getAttribute('class');
			if (fill) {
				for (j=0;j<color_range.length;j++){
                    if (fill.toString().toLowerCase() == color_range[j].HEX.toLowerCase()) { color_level = j; break};
                    
				};
			}
            title = row.getElementsByTagName('title')[0].innerHTML;
            if (!title) {
                string = new XMLSerializer().serializeToString(row.getElementsByTagName('title')[0]);
                pos = string.indexOf('>');
                title = string.substring(pos+1,pos+4);
            }
			text = row.getElementsByTagName('text')[0];
            //Four  conditions for black (instead of white text): 
            // 1. if color_level is 0/1/2 (out of 0-4) which indicates light background-colors.  
            // 2. if deselected (grey background)
            // 3. If no fill-color is found
            // 4. If the 0-10 value is < 3 (for quantile-based threshold indicators, it can happen that the above are not enough. This is a hard cut to make sure that for low-indicators we can see the text.)
			if (selection == 'deselected' && title.substring(0,7) == 'No Data') { text.style.fill = 'white';}
            else if (color_level <= 2 
                || selection == 'deselected' 
                || !fill 
                || parseInt(title.substring(0,3)) < 3
                ) { text.style.fill = 'black'; } 
            else { text.style.fill = 'white';};
		}
	}
    
    //Function to sort either by Indicator Score (descending) or by Area Name (ascending)
	sort = function(type) {
		if (type === 'value') {
			rowChart.ordering(function(d) {return isNaN(d.value) ? 0 : -d.value; });
		} else if (type == 'name') {
			rowChart.ordering(function(d) {if (d.value == 0) {return 'zzz';} else {return lookup[d.key];};});
		}
		rowChart.redraw();
		row_text(color_range);
	};
    
    //Function to immediately scroll back to the top (especially handy in mobile setting)
    scrollRowChart = function() {
        $('#tabular-wrapper').scrollTop(0);
    };


	///////////////////////////////
	// SIDEBAR: INDICATOR CHANGE //
	///////////////////////////////
    
	change_indicator = function(id) {
        
        metric = id;
		metric_label = meta_label[id];
		mapchartColors = mapchartColors_func(metric);
		whereGroupSum.dispose();
		whereGroupSum = whereDimension.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
		whereGroupSum_tab.dispose();
		whereGroupSum_tab = whereDimension_tab.group().reduceSum(function(d) { if (d[metric]) {return d[metric];};});
		mapChart
			.group(whereGroupSum)
			.colors(mapchartColors)
			.colorCalculator(function(e){
				if (meta_level[metric] > 3){ 
					if (!e) {return '#cccccc';} else {return mapChart.colors()(e);}
				} else {
					if (!e) {return '#cccccc';}
					else if (e<=color_range[0].threshold) {return color_range[0].HEX;}
					else if (e<=color_range[1].threshold) {return color_range[1].HEX;}
					else if (e<=color_range[2].threshold) {return color_range[2].HEX;}
					else if (e<=color_range[3].threshold) {return color_range[3].HEX;}
					else if (e<=color_range[4].threshold) {return color_range[4].HEX;}
				}
			})
		;
		rowChart
			.group(whereGroupSum_tab)
			.colors(mapchartColors)
			.colorCalculator(function(e){
				if (meta_level[metric] > 3){ 
					if (!e) {return '#cccccc';} else {return mapChart.colors()(e.value);}
				} else {
					if (!e) {return '#cccccc';}
					else if (e.value<=color_range[0].threshold) {return color_range[0].HEX;}
					else if (e.value<=color_range[1].threshold) {return color_range[1].HEX;}
					else if (e.value<=color_range[2].threshold) {return color_range[2].HEX;}
					else if (e.value<=color_range[3].threshold) {return color_range[3].HEX;}
					else if (e.value<=color_range[4].threshold) {return color_range[4].HEX;}
				}
			})
		;
        
        //This is needed to make sure that indicator-changes do not affect selections in map or row-chart
		if (chart_show == 'row' && row_filters.length >= 1 && map_filters_old.length >= 1) {
            row_filters_old = $.extend( [], row_filters);
			click_filter = false;
			rowChart.filter([row_filters]);
			click_filter = true;
			rowChart.redraw();
		} else if (chart_show == 'map' && map_filters.length >= 1) {
            map_filters_old = $.extend( [], map_filters);
			click_filter = false;
            mapChart.filter(null);
			mapChart.filter([map_filters_old]);
			click_filter = true;
			mapChart.redraw();
        } else {
			dc.redrawAll();
		}
        
        //Run the functions that determines black/white text in row-chart
		row_text(color_range);
        
        //Update some labels and colors based on new indicator
		document.getElementById('metric_label').firstChild.innerHTML = metric_label;
		document.getElementById('indicator-button').style.backgroundColor = color_range[3].HEX;
        document.getElementsByClassName('reset-button')[0].style.backgroundColor = color_range[3].HEX;
        document.getElementsByClassName('reset-button')[1].style.backgroundColor = color_range[3].HEX;
		document.getElementById('area_selection').style.color = color_range[3].HEX;
	};

    
	/////////////////////////////
	// SIDEBAR: METADATA POPUP //
	/////////////////////////////

	//Function to open the modal with information on indicator
	info = function(id) {
        
		metric = id;
		metric_label = meta_label[metric];
        //Determine icon for popup
		if (groups.indexOf(metric.substring(0,6)) > -1) {
			metric_icon = img_path + metric.substring(0,6) + '.png';
		} else {
			metric_icon = img_path + metric.substring(0,2) + '.png';
		}
		document.getElementsByClassName('metric_icon')[0].setAttribute('src',metric_icon);
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].firstChild.innerHTML = metric_label; };
        
        //Empty current fillings first
		for (var i=0;i<$('.metric_indicator').length;i++){ $('.metric_indicator')[i].innerHTML = ''; };
		for (var i=0;i<$('.metric_provider').length;i++){ $('.metric_provider')[i].innerHTML = ''; };
		for (var i=0;i<$('.metric_source').length;i++){
			$('.metric_source')[i].innerHTML = '';
			$('.metric_source')[i].href = '';
		};
		for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = ''; };
        
        //If no source-indicators found, report this
		if (lookup_indicator[metric].length == 0) {
			for (var i=0;i<$('.metric_indicator').length;i++){ $('.metric_indicator')[i].innerHTML = 'No metadata found for this indicator'; };
		}
        
        //Otherwise, if one source-indicator found, fill the popup with needed information
		else if (lookup_indicator[metric].length == 1) {
			metric_indicator = lookup_indicator_label[metric][0]; 
			metric_provider = lookup_provider[metric][0]; 
			metric_source = lookup_link[metric][0]; 
			metric_desc = lookup_description[metric][0]; 
			for (var i=0;i<$('.metric_indicator').length;i++){ $('.metric_indicator')[i].innerHTML = metric_indicator; };
			for (var i=0;i<$('.metric_provider').length;i++){ $('.metric_provider')[i].innerHTML = metric_provider; };
			for (var i=0;i<$('.metric_source').length;i++){
				$('.metric_source')[i].innerHTML = metric_source;
				$('.metric_source')[i].href = metric_source;
			};
			for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = metric_desc; };
        
        //Otherwise, if >1 source-indicator found, fill the popup, but now in bullet-wise style    
		} else if (lookup_indicator[metric].length > 1) {
			for (var i=0;i<$('.metric_indicator').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_indicator')[i].innerHTML += '<li>' + lookup_indicator_label[metric][j] + '</li>';
				};
			}
			for (var i=0;i<$('.metric_provider').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_provider')[i].innerHTML += '<li>' + lookup_provider[metric][j] + '</li>';
				};
			}
			for (var i=0;i<$('.metric_source').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_source')[i].innerHTML += '<li>' + lookup_link[metric][j] + '</li>';
					$('.metric_source')[i].href = undefined;
				};
			};
			for (var i=0;i<$('.metric_desc').length;i++){
				for (var j=0;j<lookup_provider[metric].length;j++) {
					$('.metric_desc')[i].innerHTML += '<li>' + lookup_description[metric][j] + '</li>';
				};
			};

		}
        
        //Show the popup
		$('#infoModal').modal('show');
	};
    
    
	////////////////////////////////
	// SIDEBAR: ACCORDION CLOSING //
	////////////////////////////////

	// Make sure that when opening another accordion-panel, the current one collapses
	// LEVEL 1
	var acc = document.getElementsByClassName('accordion-header level1');
	var panel = document.getElementsByClassName('collapse level1');
	var active = panel[0];
	acc[0].onclick = function() {
        active.classList.remove('in');
        active = panel[0];
    }
    for (var i = 1; i < acc.length; i++) {
		acc[i].onclick = function() {
			var active_new = document.getElementById(this.id.replace('heading','collapse'));
			if (active.id !== active_new.id) {
				active.classList.remove('in');
			}
			active = active_new;
		}
	}
	// LEVEL 2
	var acc2 = document.getElementsByClassName('accordion-header level2');
	var panel2 = document.getElementsByClassName('collapse level2');
	var active2 = panel2[0]; //document.getElementsByClassName('collapse in level2')[0];
	for (var i = 0; i < acc2.length; i++) {
		acc2[i].onclick = function() {
			var active_new2 = document.getElementById(this.id.replace('heading','collapse'));
			if (active2.id !== active_new2.id) {
				active2.classList.remove('in');
			}
			active2 = active_new2;
		}
	}
	// LEVEL 3
	var acc3 = document.getElementsByClassName('accordion-header level3');
	var panel3 = document.getElementsByClassName('collapse level3');
	var active3 = panel3[0]; //document.getElementsByClassName('collapse in level3')[0];
	for (var i = 0; i < acc3.length; i++) {
		acc3[i].onclick = function() {
			var active_new3 = document.getElementById(this.id.replace('heading','collapse'));
			if (active3.id !== active_new3.id) {
				active3.classList.remove('in');
			}
			active3 = active_new3;
		}
	}
	// LEVEL 4
	var acc4 = document.getElementsByClassName('accordion-header level4');
	var panel4 = document.getElementsByClassName('collapse level4');
	var active4 = panel4[0]; //document.getElementsByClassName('collapse in level4')[0];
	for (var i = 0; i < acc4.length; i++) {
		acc4[i].onclick = function() {
			var active_new4 = document.getElementById(this.id.replace('heading','collapse'));
			if (active4.id !== active_new4.id) {
				active4.classList.remove('in');
			}
			active4 = active_new4;
		}
	}
	// LEVEL 5
	var acc5 = document.getElementsByClassName('accordion-header level5');
	var panel5 = document.getElementsByClassName('collapse level5');
	var active5 = panel5[0]; //document.getElementsByClassName('collapse in level5')[0];
	for (var i = 0; i < acc5.length; i++) {
		acc5[i].onclick = function() {
			var active_new5 = document.getElementById(this.id.replace('heading','collapse'));
			if (active5.id !== active_new5.id) {
				active5.classList.remove('in');
			}
			active5 = active_new5;
		}
	}
	// LEVEL 6
	var acc6 = document.getElementsByClassName('accordion-header level6');
	var panel6 = document.getElementsByClassName('collapse level6');
	var active6 = panel6[0]; //document.getElementsByClassName('collapse in level6')[0];
	for (var i = 0; i < acc6.length; i++) {
		acc6[i].onclick = function() {
			var active_new6 = document.getElementById(this.id.replace('heading','collapse'));
			if (active6.id !== active_new6.id) {
				active6.classList.remove('in');
			}
			active6 = active_new6;
		}
	}
	// LEVEL 7
	var acc7 = document.getElementsByClassName('accordion-header level7');
	var panel7 = document.getElementsByClassName('collapse level7');
	var active7 = panel7[0]; //document.getElementsByClassName('collapse in level7')[0];
	for (var i = 0; i < acc7.length; i++) {
		acc7[i].onclick = function() {
			var active_new7 = document.getElementById(this.id.replace('heading','collapse'));
			if (active7.id !== active_new7.id) {
				active7.classList.remove('in');
			}
			active7 = active_new7;
		}
	}
	// LEVEL 8
	var acc8 = document.getElementsByClassName('accordion-header level8');
	var panel8 = document.getElementsByClassName('collapse level8');
	var active8 = panel8[0]; //document.getElementsByClassName('collapse in level8')[0];
	for (var i = 0; i < acc8.length; i++) {
		acc8[i].onclick = function() {
			var active_new8 = document.getElementById(this.id.replace('heading','collapse'));
			if (active8.id !== active_new8.id) {
				active8.classList.remove('in');
			}
			active8 = active_new8;
		}
	}
	// LEVEL 9
	var acc9 = document.getElementsByClassName('accordion-header level9');
	var panel9 = document.getElementsByClassName('collapse level9');
	var active9 = panel9[0]; //document.getElementsByClassName('collapse in level9')[0];
	for (var i = 0; i < acc9.length; i++) {
		acc9[i].onclick = function() {
			var active_new9 = document.getElementById(this.id.replace('heading','collapse'));
			if (active9.id !== active_new9.id) {
				active9.classList.remove('in');
			}
			active9 = active_new9;
		}
	}
	// LEVEL 10
	var acc10 = document.getElementsByClassName('accordion-header level10');
	var panel10 = document.getElementsByClassName('collapse level10');
	var active10 = panel10[0]; //document.getElementsByClassName('collapse in level10')[0];
	for (var i = 0; i < acc10.length; i++) {
		acc10[i].onclick = function() {
			var active_new10 = document.getElementById(this.id.replace('heading','collapse'));
			if (active10.id !== active_new10.id) {
				active10.classList.remove('in');
			}
			active10 = active_new10;
		}
	}

    
	///////////////////////////////////
	// SIDEBAR: MAP & TABULAR SWITCH //
	///////////////////////////////////

	//Switch between MAP and TABULAR view
    mapShow = function() {
        
        row_filters_old = $.extend( [], row_filters );
        
        //Zoom to selected countries in row-chart
        // if (chart_show == 'map') {
            // var districts_temp = JSON.parse(JSON.stringify(d.Districts));
			// districts_temp.features = [];
			// for (var i=0;i<d.Districts.features.length;i++){
				// if (map_filters.indexOf(d.Districts.features[i].properties.id) > -1) {
					// districts_temp.features.push(d.Districts.features[i]);
				// }
			// }
			// zoomToGeom(districts_temp);
        // } else 
        if (row_filters_old.length == 0) {
			zoomToGeom(d.Districts);
		} else {
            
            var zoombutton = document.getElementsByClassName('reset-button')[1];
            zoombutton.style.visibility = 'visible';
            
			var districts_temp = JSON.parse(JSON.stringify(d.Districts));
			districts_temp.features = [];
			for (var i=0;i<d.Districts.features.length;i++){
				if (row_filters_old.indexOf(d.Districts.features[i].properties.id) > -1) {
					districts_temp.features.push(d.Districts.features[i]);
				}
			}
			zoomToGeom(districts_temp);
		}
        
		if (chart_show == 'row') {
			chart_show = 'map';
			$('#row-chart-container').hide();
			$('#map-chart').show();

			click_filter = false;
			coming_from_tab = true;
			rowChart.filter(null);
			mapChart.filter([row_filters]);
            map_filters = $.extend( [], row_filters_old ); 
            map_filters_old = $.extend( [], row_filters_old ); 
			rowChart.filter(null);
			click_filter = true;
			coming_from_tab = false;
		}



	}

	map_filters_old = [];
	tabularShow = function() {
        
        var zoombutton = document.getElementsByClassName('reset-button')[1];
		zoombutton.style.visibility = 'hidden';
        
        chart_show = 'row';
		$('#map-chart').hide();
		document.getElementById('row-chart-container').style.visibility = 'visible';
		$('#row-chart-container').show();

		click_filter = false;
		coming_from_map = true;
		map_filters_old = $.extend( [], map_filters );
        row_filters_old = $.extend( [], map_filters );
		rowChart.filter([map_filters]);
		mapChart.filter(null);
		mapChart.filter([map_filters_old]);
		rowChart.redraw();
		click_filter = true;
		coming_from_map = false;
        
	}
    
    // This changes the active-state styling between Map View and Tabular View buttons, after switching
    $('.view-buttons button').click(function(e) {
        $('.view-buttons button.active').removeClass('active');
        var $this = $(this);
        if (!$this.hasClass('active')) {
            $this.addClass('active');
        }  
        e.preventDefault();
    });
    
    ///////////////////////////
	// SIDEBAR: RESET BUTTON //
	///////////////////////////

	reset_function = function() {
		dc.filterAll();
		dc.redrawAll();
		map_filters_old = [];
		row_filters_old = [];
		updateHTML(row_filters_old);
		for (var i=0;i<$('.filter-count').length;i++){ $('.filter-count')[i].innerHTML = 'All '; };
        var resetbutton = document.getElementsByClassName('reset-button')[0];
		resetbutton.style.visibility = 'hidden';
		if (chart_show == 'map') {zoomToGeom(d.Districts);};
		if (chart_show == 'row') {row_text(color_range);};
	}
    
    zoom_function = function() {
        if (chart_show == 'map') {
            var districts_temp = JSON.parse(JSON.stringify(d.Districts));
			districts_temp.features = [];
			for (var i=0;i<d.Districts.features.length;i++){
				if (map_filters.indexOf(d.Districts.features[i].properties.id) > -1) {
					districts_temp.features.push(d.Districts.features[i]);
				}
			}
			zoomToGeom(districts_temp);
        }
    }





	//////////////////////////////
	// HEADER FUNCTIONS: EXPORT //
	//////////////////////////////

	//Export to CSV function
	export_csv = function() {

		var content = data_final;
		var finalVal = '';

		for (var i = 0; i < content.length; i++) {
			var value = content[i];
			var key,innerValue,result;
			if (i === 0) {
				for (key in value) {
					if (value.hasOwnProperty(key)) {
						innerValue = meta_label[key] ? meta_label[key] : key;
						result = innerValue.replace(/"/g, '');
						if (result.search(/("|,|\n)/g) >= 0)
							result = '' + result + '';
						if (key !== 'pcode') finalVal += ',';
						finalVal += result;
					}
				}
			finalVal += '\n';
			}

			for (key in value) {
				if (value.hasOwnProperty(key)) {
					innerValue = JSON.stringify(value[key] == 0.01 ? 0 : value[key]);
					result = innerValue.replace(/"/g, '');
					if (result.search(/("|,|\n)/g) >= 0)
						result = '' + result + '';
					if (key !== 'pcode') finalVal += ',';
					finalVal += result;
				}
			}

			finalVal += '\n';
		}

		if (typeof L_PREFER_CANVAS !== 'undefined') {
            var IEwindow = window.open();
            IEwindow.document.write('sep=,\r\n' + finalVal);
            IEwindow.document.execCommand('SaveAs', null,"export_change_extension_to_csv.txt");
            IEwindow.document.close();
            IEwindow.close();
        } else {
            var download = document.getElementById('download');
            download.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(finalVal));
            download.setAttribute('download', 'export.csv');
            //download.click();
        }
	};

	//Export to JSON (NOT shown in dashboard)
	export_json = function() {
		var myWindow = window.open('','','_blank');
		myWindow.document.write(JSON.stringify(d.workflow_info))
		myWindow.focus();
	}

	//Create parameter-specific URL and show it in popup to copy
	function addParameterToURL(inform_model,workflow_id,metric,chart_show){
		var _url = location.href;
		_url = _url.split('?')[0];
		_url += (_url.split('?')[1] ? '&':'?') + 'workflowgroup='+inform_model+'&workflow_id='+workflow_id+'&metric='+metric+'&view='+chart_show;
		document.getElementById('shareable_URL').innerHTML = _url;
		return _url;
	}

	share_URL = function() {
		shareable_URL = addParameterToURL(d.inform_model,d.workflow_id,metric,chart_show);
		$('#URLModal').modal('show');
	}

	//Export to GEOJSON
	link_data = function() {
        
		if (d.system == 'INFORM'){
			var url = url_global; 
        } else {
            var url = d.lookup_systems_url[d.system];
        };
		var excel = document.getElementById('excel');
		excel.setAttribute('href', url);
		//excel.click();
	}


    //////////////////////////////////
	// HEADER FUNCTIONS: MODEL MENU //
	//////////////////////////////////
    
    //Load the workflow-groups ..
    var workflows = api_base + 'Workflows/WorkflowGroups';
    d3.json(setting == 'api' ? workflows : 'data/workflows.json',function(data_workflows) {
        
        // .. which is only used to determine the maximum year
        var max_year = 0;
        for (var k=0;k<data_workflows.length;k++) {
            if (data_workflows[k].indexOf('_') <= -1) {
                var year = data_workflows[k].substring(6,10)*1;
                var max_year = Math.max(year,max_year);
            }
        };
        
        // .. Then open the available systems
        var systems = api_base + 'Workflows/Systems';
        d3.json(setting == 'api' ? systems : 'data/systems.json',function(data_systems) {
            d.Systems = data_systems; 
            
            // Create a lookup-table of systems to get the subnational link from (for function 'link_data')
            var genLookup_systems = function (field){
                var lookup_systems = {};
                d.Systems.forEach(function(e){
                    lookup_systems[e.Code] = String(e[field]);
                });
                return lookup_systems;
            };
            d.lookup_systems_url = genLookup_systems('PageUrl');
            
            //.. Find the HTML-element to which the model-options will be connected (and clean it up first)
            var ul = document.getElementById('model-items');
            while (ul.childElementCount > 0) { ul.removeChild(ul.firstChild);};
            
            //.. Loop through the systems and create HTML (1st dropdown) for each of them
            for (var i=0;i<data_systems.length;i++) {
                
                // .. This filter only has affect when the goal is to filter on particular systems only
                if (!filter_models || (filter_models && system_filter.indexOf(data_systems[i].Code) > -1)) {
                    
                    var li = document.createElement('li');
                    li.setAttribute('class','dropdown-submenu');
                    ul.appendChild(li);
                    var a = document.createElement('a');
                    a.setAttribute('class','dropdown-toggle export-button submenu-item models1');
                    a.setAttribute('data-toggle','dropdown');
                    a.setAttribute('href','#');
                    a.innerHTML = data_systems[i].Fullname;
                    li.appendChild(a);
                    var fa = document.createElement('i');
                    fa.setAttribute('class','fa fa-angle-left export-btn-arrow menu-arrow');
                    fa.setAttribute('style','float:left');
                    a.appendChild(fa);
                    eval("var ul" + i +" = document.createElement('ul');");
                    eval("ul" + i + ".setAttribute('class','dropdown-menu');");
                    eval("li.appendChild(ul" + i + ");");
                                        
                    // Now loop through all the workflows (ALL each time, because we cannot filter by system in API)
                    var workflow_info = api_base + 'workflows'; 
                    (function (_i) {
                        d3.json(setting == 'api' ? workflow_info : 'data/workflow_' + data_systems[_i].Code + '.json',function(workflow_info) {
                            
                            //Here we do immediately filter on only the workflows which relate to the current system (and in case of Global model, only those related to the current year)
                            workflow_info = $.grep(workflow_info, function(e){ return e.System.toUpperCase() == data_systems[_i].Code
                                                                    && ((e.System.toUpperCase() == 'INFORM' && e.WorkflowGroupName.substring(6,10) == max_year) || e.System.toUpperCase() !== 'INFORM')                            
                                                                    && e.FlagGnaPublished               //Additional filter needed
                                                                    && e.WorkflowGroupName !== ''       //Additional filter needed
                                                                    ;});
                            
                            //For the global model, we sort by name so that the reruns go to the bottom
                            if (data_systems[_i].Code == 'INFORM') {
                                workflow_info.sort(function(a, b){
                                    if(a.Name < b.Name) return -1;
                                    if(a.Name > b.Name) return 1;
                                    return 0;
                                });
                            }
                            
                            //Loop through the workflows and create HTML (2nd dropdown) for each of them.
                            for (var j=0;j<workflow_info.length;j++) {
                                                                 
                                var li = document.createElement('li');
                                eval("ul" + _i + ".appendChild(li);");
                                var a = document.createElement('a');
                                a.setAttribute('class','submenu-item');
                                a.setAttribute('onClick','load_dashboard(\'' + workflow_info[j].WorkflowGroupName + '\',' + workflow_info[j].WorkflowId + ')');
                                a.setAttribute('role','button');
                                a.innerHTML = workflow_info[j].Name;
                                li.appendChild(a);
                             
                            };
                        
                        });
                    })(i);
                }
            };
            //Functionality to make sure that 2nd dropdown disappears when clicking another element
            $('.dropdown a.models0').on("click", function(e){
                $('.dropdown-submenu a.models1').next('ul').css('display','none');
            });
            $('.dropdown-submenu a.models1').on("click", function(e){
                $('.dropdown-submenu a.models1').not(this).next('ul').css('display','none');
                $(this).next('ul').toggle();
                e.stopPropagation();
                e.preventDefault();
            });
        });
        
    });
            
            







	/////////////////////////
	// RENDER MAP AND PAGE //
	/////////////////////////

	//Render all dc-charts and -tables
	dc.renderAll();
    row_text(color_range);
    
    //Move zoom-buttons to the lower-right corner
	var zoom_child = $('.leaflet-control-zoom')[0];
	var zoom_parent = $('.leaflet-bottom.leaflet-right')[0];
	zoom_parent.insertBefore(zoom_child,zoom_parent.childNodes[0]);
    //In mobile, move the legend to the lower-right corner
    if($(window).width() < 768) {
        var legend_child = $(".info.legend.leaflet-control")[0];
        var legend_parent = $(".leaflet-bottom.leaflet-right")[0];
        legend_parent.insertBefore(legend_child,legend_parent.childNodes[0]);
    }
    
    //Initialize map
	map = mapChart.map();
    
    //Add (disputed) borders for global model
    var polygon_layer;
    for (var x in map._layers) {
        if (map._layers[x]._layers) {
            polygon_layer = map._layers[x];
        }
    }
    if (d.system == 'INFORM') {
        
        polygon_layer.setStyle({weight:0});
        
        var solid_style = {
            color: '#444444',
            weight: 0.5
        };
        var dashed_style = {
            color: '#444444',
            weight: 1.0,
            dashArray: '5,10'
        }
        var dotted_style = {
            color: '#444444',
            weight: 1.0,
            dashArray: '2,5'
        }
        var lineStyles = function(feature) {
            switch(feature.properties.CARTOGRAPH) {
                case "International boundary": return solid_style; break;
                case "Short international boundary": return solid_style; break;
                case "Dashed": return dashed_style; break;
                case "SDN-SSD": return dashed_style; break;
                case "Bnd former Palestinian mandate": return dashed_style; break;
                case "Abyei North": return dotted_style; break;
                case "Abyei South": return dotted_style; break;
                case "Dotted": return dotted_style; break;
            }
        }
        var lines = d.borders.features;
        var border_layer = L.geoJSON(lines,{style:lineStyles});
        border_layer.addTo(map);
        
    } else {
        polygon_layer.setStyle({weight:0.5});
    }
    
    //Zoom to selection in map
	function zoomToGeom(geom){
		var bounds = d3.geo.bounds(geom);
        console.log(bounds);
		map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
	}
	zoomToGeom(d.Districts);
    
    //Show map
	if (chart_show == 'map') {
		$('#row-chart-container').hide();
	} else if (chart_show == 'row') {
		tabularShow();
	}
    
    //Final CSS
    $(".sidebar-wrapper").addClass("in");
    $('.view-buttons button.active').removeClass('active');
    $('.view-buttons button.btn-map-view').addClass('active');
};
