/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import ISelectionId = powerbi.visuals.ISelectionId;
import { VisualSettings } from "./settings";

// imports d3 library
import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

// run npm install powerbi-visuals-utils-tooltiputils --save to install in project
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper, TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils";
import { style } from "d3";

interface DataPoint {
    textLabelCont: string;
    textValueCont: string;
    tooltips: VisualTooltipDataItem[];
    selectionId: ISelectionId;
};

interface ViewModel {
    dataPoints: DataPoint[];
};

export class Visual implements IVisual {

    // private properties for Visual class
    private host: IVisualHost;
    private svg: Selection<SVGElement>;
    private circleContainer: Selection<SVGElement>;
    private circle: Selection<SVGElement>;
    private textValue: Selection<SVGElement>;
    private textLabel: Selection<SVGElement>;
    private visualSettings: VisualSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    constructor(options: VisualConstructorOptions) {
        // let some browser console notifications for log tracking
        console.log('Visual constructor', options);

        // Create initial visual at opening
        this.host = options.host;
        this.svg = d3.select(options.element)
            .append("svg")
            .classed("circleCard", true);
        this.circleContainer = this.svg.append("g")
            .classed("container", true);
        this.circle = this.circleContainer.append("circle")
            .classed("circle", true);
        this.textValue = this.circleContainer.append("text")
            .classed("textValue", true);
        this.textLabel = this.circleContainer.append("text")
            .classed("textLabel", true);

        // run tooltip wrapper
        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            options.host.tooltipService,
            options.element
        )
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const settings: VisualSettings = this.visualSettings || <VisualSettings>VisualSettings.getDefault();
        return VisualSettings.enumerateObjectInstances(settings, options);
    }

    public update(options: VisualUpdateOptions) {
        // let some browser console notifications for log tracking
        console.log('Visual update', options);
                
        let ViewModel = this.getViewModel(options);
        console.log("ViewModel", ViewModel);

        let dataView: DataView = options.dataViews[0];
        console.log("DataView", options.dataViews);

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        this.svg.attr("width", width);
        this.svg.attr("height", height);
        let radius: number = Math.min(width, height) / 2.2;

        this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

        this.visualSettings.circle.circleThickness = Math.max(0, this.visualSettings.circle.circleThickness);
        this.visualSettings.circle.circleThickness = Math.min(10, this.visualSettings.circle.circleThickness);

        this.circle
            .style("fill", this.visualSettings.circle.circleColor)
            .style("fill-opacity", 0.5)
            .style("stroke", "black")
            .style("stroke-width", this.visualSettings.circle.circleThickness)
            .style("r", radius)
            .style("cx", width / 2)
            .style("cy", height / 2);
        
        let fontSizeValue: number = Math.min(width, height) / 5;
        this.textValue
            .text(ViewModel.dataPoints[0].textValueCont)
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .style("font-size", fontSizeValue + "px");
        
            let fontSizeLabel: number = fontSizeValue / 4;
        this.textLabel
            .text(ViewModel.dataPoints[0].textLabelCont)
            .attr("x", "50%")
            .attr("y", height / 2)
            .attr("dy", fontSizeValue / 1.2)
            .attr("text-anchor", "middle")
            .style("font-size", fontSizeLabel + "px");

        // add tooltip to visual
        this.tooltipServiceWrapper.addTooltip(
            this.svg.selectAll(".textValue"),
            (tooltipEvent: TooltipEventArgs<number>) => ViewModel.dataPoints[0].tooltips,
            (tooltipEvent: TooltipEventArgs<number>) => ViewModel.dataPoints[0].selectionId
        );
    }

    private getViewModel(options: VisualUpdateOptions): ViewModel {
        
        let dv = options.dataViews;

        let ViewModel: ViewModel = {
            dataPoints: []
        };

        // returns a empty data model when there is nothing to show
        if (!dv
            || !dv[0]
            || !dv[0].single
            || !dv[0].single.value
            || !dv[0].metadata)
            return ViewModel;
        
        let metadata = dv[0].metadata;
        let cardlabel = metadata.columns[0].displayName;
        let cardtext = <string>dv[0].single.value;

        ViewModel.dataPoints.push({
            textLabelCont: cardlabel,
            textValueCont: cardtext,
            tooltips: [{
                displayName: "1,2 1,2 testing",
                value: " som, som Isto é um teste!"
            }],
            //selectionId: null
            selectionId: this.host.createSelectionIdBuilder()
                .withMeasure(dv[0].metadata.columns[0].queryName)
                .createSelectionId()
        })

        return ViewModel;
    }
}