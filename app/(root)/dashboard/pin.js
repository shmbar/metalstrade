/* eslint-disable react/prop-types */
import React from "react";
import { Marker } from "@react-google-maps/api";

const Pin = ({ position, index, clusterer }) => (
  <Marker key={index} position={position} clusterer={clusterer} />
);

Pin.defaultProps = {
  children: null,
  opacity: 1,
  onClickFunc: () => {}
};
export default Pin;
