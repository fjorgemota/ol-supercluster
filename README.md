# OpenLayers Super Cluster

This library basically integrates [OpenLayers](https://openlayers.org) with [SuperCluster](https://github.com/mapbox/supercluster). The purpose is to allow faster and precise clustering on OpenLayers in a way that's compatible with OpenLayers's Cluster Source, with only a few additional changes. It's composed by just one class, which can be used instead of `ol.Source.Cluster`, and that receives one additional required parameter: `view`, which is precisely Map's View.


## Installation

The installation of this package is very simple: In fact, it can be installed by just running:

```
    npm install --save ol-supercluster
```

If using NodeJS (this installs the package based purely on ES 6), or:

```
    bower install --save ol-supercluster
```

If you want to use this package in the browser. You can also use the version provided by a CDN, like [JSDelivr](https://www.jsdelivr.com/package/npm/ol-supercluster). So you can paste the code below on a page and start using ol-supercluster really fast:

```html
<script language="javascript" type="text/javascript" src="https://cdn.jsdelivr.net/npm/ol-supercluster@latest/dist/ol-supercluster.js"></script>
```

**WARNING**: Please note that the code above uses always the latest version of ol-supercluster. In production, please replace *latest* with a [valid version number from the Releases page](https://github.com/fjorgemota/ol-supercluster/releases) or use NPM to install a fixed version for you. =)


## Usage

To use this library, you basically can instance the constructor in a way very similar to how `ol/source/Cluster` works:

```js
import { Map as OlMap } from "ol";
import { toLonLat } from 'ol/proj';
import { Vector as VectorSource } from 'ol/source';
import SuperCluster from 'ol-supercluster';

const map = new OlMap({
    // Your usual openlayers map here
});

const features = new VectorSource();

const cluster = new SuperCluster({
    source: features, // Required parameter to define the source of the features to pass to SuperCluster
    view: map.getView(), // Required parameter, usually got by `map.getView()`, used to compute some parameters passed into SuperCluster's algorithm
    radius: 60, // Optional parametern to define the  cluster radius, as refered in SuperCluster documentation, the default value is 60
    geoJsonFunction: function(feature) {
        const geometry = feature.getGeometry();
        return {
            "type": "Feature",
            "properties":  null,
            "geometry": {
                "type": "Point",
                "coordinates": toLonLat(geometry.getCoordinates())
            }
        };
    }, // Optional parameter that allows to convert an OpenLayers Feature into a GeoJSON feature whose geometry is a Point, as supported by SuperCluster (for instance, you may get the center of your geometry here, for example)
});
```

After (or even before) you initialize SuperCluster source, you can just add features with points to your `features` VectorSource, like that:

```js
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
const longitude = -43.2315809;
const latitude = -22.9139167;
features.addFeature(new Feature(new Point(fromLonLat([longitude, latitude]))))
```

You can pass the created `cluster` to any Layer that works with VectorSource, like for instance [ol-ext](https://github.com/Viglino/ol-ext)'s AnimatedCluster:

```js
import AnimatedCluster from "ol-ext/layer/AnimatedCluster";

const layerCluster = new AnimatedCluster({
    source: cluster,
    // other AnimatedCluster parameters..
});
```

Or even openlayers's VectorLayer:

```js
import { Vector as VectorLayer } from 'ol/layer';

const layerCluster = new VectorLayer({
    source: cluster,
    // other VectorLayer parameters...
});
```

## Contributing

We still must work on improving documentation, adding tutorial, examples and tests. Feel free to contribute with Pull Requests:

- [ ] Documentation;
- [ ] Tutorial;  
- [ ] Examples;
- [ ] Tests;
