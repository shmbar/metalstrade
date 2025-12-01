import React, { useState, useEffect } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import GMap from './map';
 

const MyMap = () => {
  const [loadMap, setLoadMap] = useState(false);
 
  useEffect(() => {
    const options = {
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ['geometry']
    };
 
    new Loader(options).load().then(() => {
      setLoadMap(true);
    }).catch(e => {
      console.error('Sorry, something went wrong: Please try again later. Error:', e);
    });
  }, []);
 
  return (
    <div className="App">
    
      {!loadMap ? <div>Loading...</div> : <GMap />}
      <br />
      <small><b>Note:</b> In order to make it work, you have to set the YOUR_GOOGLE_MAP_API_KEY in App.js file. </small>
    </div>
  );
}
 
export default MyMap;


/*
import React, {useState} from 'react'
import { GoogleMap, useJsApiLoader, Marker, MarkerF, InfoWindowF } from '@react-google-maps/api';


const containerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '8px'
};

const center = {
    lat: 52,
    lng: 15
};

const Maps = () => {

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    })

    const Map = () => {
        return (
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={4}
                options={{streetViewControl: false, mapTypeControl: false,}}
            >
                <Marker position={center} 
                 icon={"http://maps.google.com/mapfiles/ms/icons/red.png"}
                >
                    <InfoWindowF  position={center}
                        zIndex={1}
                        options={{
                            pixelOffset:{width:0, height:-30},
                            style:{backGround: 'red'},
                            hideCloseButton: true,
                        }}>
                      <div className='text-red-500'>adfdf</div>
                    </InfoWindowF>
                </Marker>
            </GoogleMap>

        )
    }

    if (!isLoaded) return <div>Loading...</div>
    return <Map />;



}



export default Maps;

*/