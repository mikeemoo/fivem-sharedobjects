import { createNamespace } from "../../../lib/sharedObjects";
import { Vector3 } from "fivem-js";
import { ObjectProps } from "../types";

type ObjectActions = ObjectProps & {
  rotateProp: (this: ObjectActions) => void;
};

// create a namespace for our objects
const ns = createNamespace<ObjectActions>("myNamespace");

// when we get a message from the client telling us to do something..
onNet("addprop", async (id: string, propName: string, playerId: string) => {

  // find the player location
  const pedId = GetPlayerPed(playerId);
  const [ x, y, z ] = GetEntityCoords(pedId);
  const location = new Vector3(x, y, z);

  // create a shared object in the namespace.
  // it will send the full object (and then diffs) to anyone within 100 units of [location]
  const { obj, destroy } = ns.createObject(id, location, 100, {

    // any properties we want..
    propName,
    location,
    rotation: 0,

    // actions to modify the properties
    rotateProp() {
      this.rotation++;
    }

  });
  
  // an example of changing the properties of the sharedObject to allow it to sync with the clients
  const intvRot = setInterval(() => {
    obj.rotateProp();
  }, 40);
  

  // after 10 seconds lets destroy the object and clear up any timers we've set
  setTimeout(() => {
    destroy();
    clearInterval(intvRot);
  }, 10000);

});

