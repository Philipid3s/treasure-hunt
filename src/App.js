import React, { Component } from 'react';
import haversine from "haversine";
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';

import './App.css';

const LATITUDE = 29.95539;
const LONGITUDE = 78.07513;
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      latitude: LATITUDE,
      longitude: LONGITUDE,
      routeCoordinates: [],
      distanceTravelled: 0,
      prevLatLng: {}
    };
  }

  componentWillMount() {
    navigator.geolocation.getCurrentPosition(
      position => {},
      error => alert(error.message),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000
      }
    );
  }

  componentDidMount() {

    this.watchID = navigator.geolocation.watchPosition(
      position => {
        const { routeCoordinates, distanceTravelled } = this.state;
        const { latitude, longitude } = position.coords;

        const newCoordinate = {
          latitude,
          longitude
        };

        this.setState({
          latitude,
          longitude,
          routeCoordinates: routeCoordinates.concat([newCoordinate]),
          distanceTravelled:
            distanceTravelled + this.calcDistance(newCoordinate),
          prevLatLng: newCoordinate
        });
      },
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }
  
  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchID);
  }

  calcDistance = newLatLng => {
    const { prevLatLng } = this.state;
    return haversine(prevLatLng, newLatLng) || 0;
  };

  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>
            Treasure Hunt
          </p>
        </header>

        {this.state.longitude !== 0 && this.state.latitude !== 0 ? (
          <div>
            You are at{" "}
            
            <span className="coordinate">
              {this.state.latitude}
            </span>,{" "}
            
            <span className="coordinate">
              {this.state.longitude}
            </span>

          <div className="leaflet-container">
              <Map center={[this.state.latitude, this.state.longitude]} zoom={17}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
              />
              <Marker position={[this.state.latitude, this.state.longitude]}>
                <Popup>A pretty CSS3 popup.<br />Easily customizable.</Popup>
              </Marker>
              </Map>
            </div> 
          </div>
        ) : (
          <div>Getting the location data&hellip;</div>
        )}
      </div>
    );
  }
}

export default App;
