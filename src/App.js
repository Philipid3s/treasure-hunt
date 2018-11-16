import React, { Component } from 'react';
import haversine from "haversine";
import { Map, Marker, Popup, TileLayer } from 'react-leaflet';
import { Button, Table, Alert, Panel } from 'react-bootstrap';

import './App.css';

const config = require('./config');
const abi = require('./erc20_abi.json');
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');

const web3 = new Web3(new Web3.providers.HttpProvider(config.blockchain.provider));
console.log(web3);

const secretkey = new Buffer(config.blockchain.private_key, 'hex')
const fromAccount = config.blockchain.public_key;

const contractAddress = config.blockchain.contract;
const contract = new web3.eth.Contract(abi, contractAddress, 
{ from: fromAccount, gas: 100000});

const LATITUDE = 29.95539;
const LONGITUDE = 78.07513;
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

const tokens = [
  {
    id : "urban vista / 001",
    coordinates : {latitude: 1.327881, longitude: 103.944575}
  },
  {
    id: "tanah merah playgroud / 002",
    coordinates : {latitude: 1.3288562, longitude: 103.9468565}
  },
  {
    id: "domaine de kerjan / 003",
    coordinates : {latitude:48.360498, longitude: -4.746688}
  }
];

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      latitude: LATITUDE,
      longitude: LONGITUDE,
      routeCoordinates: [],
      distanceTravelled: 0,
      prevLatLng: {},
      txUrl: '',
      txError: '',
      account: ''
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

    // Modern dapp browsers...
    if (window.web3.currentProvider.isMetaMask) {
      console.log('Metamask detected');
    }
  }

  componentDidMount() {

    let toAccount = "";

    window.web3.eth.getAccounts((err, accounts) => {
      if (err) {
        console.log(err);
      }
      else {
        console.log(accounts);

        if(accounts.length > 0)
          toAccount = accounts[0];
      }
    });

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
          prevLatLng: newCoordinate,
          account: toAccount
        });

        tokens.every(({id, coordinates}) => {
          const distance = this.calcDistance(coordinates);

          if (distance <= 0.1) // distance <= 100m ( default unit : km )
          {
            document.getElementById("address").disabled = false;
            document.getElementById("btnDigUp").disabled = false;
            document.getElementById("btnDigUp").innerText = `dig up token [${id}]`;
            return false; // we want to break
          } else {
            document.getElementById("address").disabled = true;
            document.getElementById("btnDigUp").disabled = true;
            document.getElementById("btnDigUp").innerText = `no token around`;
            return true;
          }
        });
      },
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }
  
  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchID);
  }

  calcDistance = (newLatLng) => {
    const { prevLatLng } = this.state;

    return haversine(prevLatLng, newLatLng)  || 0;
  };


  getMapRegion = () => ({
    latitude: this.state.latitude,
    longitude: this.state.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA
  });

  digup = () => {
    web3.eth.getBalance(fromAccount, (err, balance) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log(web3.utils.fromWei(balance, 'ether'));
        }
    });
  
    web3.eth.getTransactionCount(fromAccount, (err, txCount) => {
      // send 1 BT BreizhToken
      const toAccount = document.getElementById("address").value;
      const data = contract.methods.transfer(toAccount, '1').encodeABI();
  
      // create transaction object
      const txObject = {
        from: fromAccount,
        nonce: web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(1000000), // raise this if necessary
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        // destination : must be the Contract Address
        to: contractAddress,
        data: data,
        chainId: 0x03
      };
      
      // sign transaction
      const tx = new Tx(txObject);
      tx.sign(secretkey);
  
      const serializedTx = tx.serialize();
  
      web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'), 
        (err, hash) => {
        if (!err) {
          const url = `https://ropsten.etherscan.io/tx/${hash}`;
          console.log(url);
          
          this.setState(
            {
              txUrl: url,
              txError: ''
            }
          );
        }
        else {
          console.log(err);

          this.setState(
            {
              txUrl: '',
              txError: err.message
            }
          );
        }
      });
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>
            Tokens Hunt
          </p>
        </header>
        
        <Panel>
          <Panel.Body><strong>Tokens Hunt DApp</strong>: a proof-of-concept for a Proof of Location (<strong>PoL</strong>) system 
          using <strong>blockchain</strong> and <strong>geolocation</strong>.</Panel.Body>
        </Panel>

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
                <Popup>your current position</Popup>
              </Marker>

              {tokens.map(({id, coordinates}) => {
                    return (
                      <Marker key={id} position={[coordinates.latitude, coordinates.longitude]}>
                        <Popup>token: {id}</Popup>
                      </Marker>
                    );
              })}

              </Map>
            </div> 
          </div>
        ) : (
          <div>Getting the location data&hellip;</div>
        )}

        <br />
        <br />
        
        <span>Your address (<a href="https://ropsten.etherscan.io/">ropsten</a> network) <input id="address" value={this.state.account}></input></span>

        <br />
        <br />

        <Button bsStyle="primary" onClick={this.digup} id="btnDigUp">
          dig up coin
        </Button>

        <br />
        <br />

        {this.state.txError !== '' ? (
          <Alert bsStyle="danger">{this.state.txError}</Alert>
        ) : (
          <Button bsStyle="link" href={`${this.state.txUrl}`}>{this.state.txUrl}</Button>
        )}

        <br />
        <br />

        <Table striped bordered condensed hover>
        <thead>
          <tr>
            <td>web3.js</td>
            <td>provider</td>
            <td>account</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{Web3.version}</td>
            <td>{typeof web3 !== 'undefined' ? ('metamask') : ('undefined')}</td>
            <td>{this.state.account}</td>
          </tr>
        </tbody>
        </Table>
      </div>
    );
  }
}

export default App;
