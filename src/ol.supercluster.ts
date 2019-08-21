/**
 * @module SuperCluster
 */

import {assert} from 'ol/asserts';
import Supercluster from "supercluster";
import {Feature, View} from 'ol';
import GeometryType from 'ol/geom/GeometryType';
import {listen} from 'ol/events';
import EventType from 'ol/events/EventType';
import { Point }  from 'ol/geom';
import {Vector as VectorSource} from 'ol/source';
import { transformExtent,  equivalent } from "ol/proj";
import { toLonLat } from 'ol/proj';
import { fromLonLat } from 'ol/proj';
import { equals, Extent } from 'ol/extent';
import Projection from 'ol/proj/Projection';
import { GeoJsonProperties } from 'geojson';

/**
 * @typedef {Object} Options
 * @property {import("ol/source/Source").AttributionLike} [attributions] Attributions.
 * @property {import("ol/view/View").View} [view] View of the map.
 * @property {number} [radius=60] Radius in pixels between clusters.
 * @property {function(Feature):GeoJSON.Feature} [geometryFunction]
 * Function that takes an {@link module:ol/Feature} as argument and returns an
 * {@link module:GeoJSON/Feature} as input for SuperCluster based on the feature. When a
 * feature should not be considered for clustering, the function should return
 * `null`. The default, which works when the underyling source contains point
 * features only, is
 * ```js
 * function(feature) {
 *   return feature.getGeometry();
 * }
 * ```
 * See {@link module:ol/geom/Polygon~Polygon#getInteriorPoint} for a way to get a cluster
 * calculation point for polygons.
 * @property {VectorSource} source Source.
 * @property {boolean} [wrapX=true] Whether to wrap the world horizontally.
 */
/**
 * @classdesc
 * Layer source to cluster vector data. Works out of the box with point
 * geometries. For other geometry types, or if not all geometries should be
 * considered for clustering, a custom `geometryFunction` can be defined.
 * @api
 */
class SuperCluster<P extends GeoJsonProperties> extends VectorSource {
  protected resolution?: number;
  protected extent?:Extent;
  protected projection?:Projection;
  protected view:View;
  protected radius: number;
  protected fastMode: boolean;
  protected features : Feature[];
  protected cluster_? : Supercluster<P>;
  protected clusterFeatures_: Feature[];
  protected geometryFunction : (feature: Feature) => Supercluster.PointFeature<P>;
  protected source: VectorSource;

  /**
   * @param {Options} options Cluster options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      wrapX: options.wrapX
    });

    /**
     * @type {number|undefined}
     * @protected
     */
    this.resolution = undefined;

    /**
     * @type {import('ol/extent').Extent|undefined}
     * @protected 
     */
    this.extent = undefined;


    /**
     * @type {import('ol/proj').ProjectionLike|undefined}
     * @protected 
     */
    this.projection = undefined;


    /**
     * @type {import("ol/view/View").View}
     * @protected
     */
    this.view = options.view;

    /**
     * @type {number}
     * @protected
     */
    this.radius = options.radius !== undefined ? options.radius : 60;


    /**
     * @type {boolean}
     * @protected
     */
    this.fastMode = options.fastMode !== undefined ? options.fastMode : false;

    /**
     * @type {Array<Feature>}
     * @protected
     */
    this.features = [];

    /**
     * @type {SuperCluster|undefined}
     * @protected
     */
    this.cluster_ = undefined;

    /**
     * @type {Array<Feature>}
     * @protected
     */
    this.clusterFeatures_ = [];

    /**
     * @param {Feature} feature Feature.
     * @return {GeoJSON.Feature} Cluster calculation point.
     * @protected
     */
    this.geometryFunction = options.geometryFunction || function(feature : Feature) :  Supercluster.PointFeature<P> {
      const geometry = /** @type {Point} */ (feature.getGeometry()) as Point;
      assert(geometry.getType() == GeometryType.POINT,
        10); // The default `geometryFunction` can only handle `Point` geometries
      return {
        "type": "Feature",
        "properties":  null,
        "geometry": {
            "type": "Point",
            "coordinates": toLonLat(geometry.getCoordinates())
        }
      };
    };

    /**
     * @type {VectorSource}
     * @protected
     */
    this.source = options.source;

    listen(this.source, EventType.CHANGE, this.refresh, this);
  }

  /**
   * Get the radius in pixels between clusters.
   * @return {number} radius.
   * @api
   */
  getRadius() {
    return this.radius;
  }

  /**
   * Get a reference to the wrapped source.
   * @return {VectorSource} Source.
   * @api
   */
  getSource() {
    return this.source;
  }

  /**
   * @inheritDoc
   */
  loadFeatures(extent: Extent, resolution: number, projection: Projection) {
    this.source.loadFeatures(extent, resolution, projection);
    if (resolution !== this.resolution || !equals(extent, this.extent) || !equivalent(projection, this.projection)) {
      this.clear();
      this.extent = extent;
      this.projection = projection;
      this.resolution = resolution;
      this.cluster(false);
      this.addFeatures(this.features);
    }
  }

  /**
   * Set the radius in pixels between clusters.
   * @param {number} radius The radius in pixels.
   * @api
   */
  setRadius(radius : number) {
    this.radius = radius;
    this.refresh();
  }

  /**
   * handle the source changing
   * @override
   */
  refresh() {
    this.clear();
    this.cluster(true);
    this.addFeatures(this.features);
    super.refresh();
    return true;
  }

  /**
   * @argument {boolean} force Force creation of new JSON
   * @protected
   */
  cluster(force : boolean) {
    if (this.resolution === undefined || this.features === undefined) {
      return;
    }
    this.features.length = 0;
    const features = this.source.getFeatures();
    if (force || !this.cluster_) {
        let geoJsonFeatures =  features.map(this.geometryFunction);
        let clusterFeatures = geoJsonFeatures.map(addIndexToFeature).filter(filterFeature);
        this.cluster_ = new Supercluster<P>({
            radius: this.radius,
            maxZoom: this.view.getMaxZoom(),
            minZoom: this.view.getMinZoom()
        });
        this.clusterFeatures_ = features;
        this.cluster_.load(clusterFeatures);
    }
    let bbox = transformExtent(this.extent, this.projection, "EPSG:4326") as GeoJSON.BBox;
    let zoom = this.view.getZoomForResolution(this.resolution);
    let result = this.cluster_.getClusters(bbox, zoom);
    for (let feature of result) {
        let cluster = new Feature(new Point(fromLonLat(feature.geometry.coordinates)));
        let isCluster = feature.properties && feature.properties.cluster === true;
        cluster.set('cluster', isCluster);
        if (cluster.get('cluster')) {
            cluster.set('cluster_id', feature.properties.cluster_id);
        } 
        if (!this.fastMode) {
            let children : Feature[] = [features[feature.properties.index]];
            if (isCluster) {
              children = this.getFeaturesForCluster(cluster);
            } 
            cluster.set('features', children);
        } else if (!isCluster) {
            cluster = features[feature.properties.index];
        }
        this.features.push(cluster);
    }
  }

  /**
   * Return all the features that are contained inside a cluster. 
   * If the feature isn't a cluster, return the feature itself.
   * 
   * @param {Feature} feature The cluster to get features inside
   * @returns {Array<Feature>} The list of features inside the cluster
   */
  getFeaturesForCluster(feature : Feature) : Feature[] {
      if (!feature.get('cluster') || !this.cluster_) {
        return [feature];
      }
      let clusterFeatures = this.cluster_.getLeaves(feature.get('cluster_id'), Infinity);
      let resultFeatures = [];
      let indexes = new Set();
      for (let clusterFeature of clusterFeatures) {
          let index = clusterFeature.properties.index;
          if (!indexes.has(index)) {
              indexes.add(index);
              resultFeatures.push(this.clusterFeatures_[index]);
          }
      }
      indexes.clear();
      return resultFeatures;
  }

  /**
   * Returns the zoom on which the cluster expands into several children 
   * (useful for "click to zoom" feature) given the feature 
   * 
   * @param {Feature} feature The feature to get the zoom to expand into
   * @returns {number} The zoom level to expand to
   */
  getClusterExpansionZoom(feature : Feature) : number {
    if (!feature.get('cluster') || !this.cluster_) {
      return this.view.getZoom();
    }
    return this.cluster_.getClusterExpansionZoom(feature.get('cluster_id'));
  }
}

/**
 * 
 * @param {GeoJSON.Feature} feature 
 * @returns {Supercluster.PointFeature}
 */
function addIndexToFeature<P>(feature : Supercluster.PointFeature<P>, index : number) : Supercluster.PointFeature<P> {
    let result = Object.assign({}, feature);
    result.properties = Object.assign({}, result.properties, {
        index: index
    });
    return result;
}

/**
 * 
 * @param {GeoJSON.Feature|undefined} feature 
 * @return {boolean}
 */
function filterFeature(feature : GeoJSON.Feature | undefined) : boolean {
    return !!feature; 
}

export default SuperCluster;
