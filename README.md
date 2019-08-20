# OpenLayers Super Cluster

This library basically integrates [OpenLayers](https://openlayers.org) with [SuperCluster](https://github.com/mapbox/supercluster). The purpose is to allow faster and precise clustering on OpenLayers in a way that's compatible with OpenLayers's Cluster Source, with only a few additional changes. It's composed by just one class, which can be used instead of `ol.Source.Cluster`, and that receives one additional required parameter: `view`, which is precisely Map's View.

## To Do (Pull requests accepted!)

- [ ] Documentation
- [ ] Tests
- [ ] Tutorial