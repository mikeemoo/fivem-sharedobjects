import { Model, Prop, Vector3, World } from "fivem-js";
import { autorun } from "mobx";
import { joinNamespace } from "../../../lib/sharedObjects";
import { ObjectProps } from "../types";

const ns = joinNamespace<ObjectProps>("myNamespace");

RegisterCommand(
  "addprop",
  async (_source, [ propId, propName ]) => {
    emitNet("addprop", propId, propName, GetPlayerServerId(PlayerId()));
  },
  false
);

// wait for new objects coming from this namespace
ns.listen(async (objectId: string, obj) => {
  
  // we have a new object. lets create a model
  const model = new Model(obj.propName);
  let prop: Prop | null = null;

  // create the object in the world
  if (model.IsProp && await model.request(1000)) {
    prop = await World.createProp(
      model,
      obj.location,
      true,
      true
    );
  }

  // don't continue if we dont have a prop object
  if (!prop) {
    return;
  }

  // these autoruns will automatically fire whenever these properties of the share object update
  const destroyAutorun1 = autorun(() => {
    prop.Rotation = new Vector3(0, 0, obj.rotation);
  });

  // give back the cleanup method
  return () => {
    // destroy the autoruns
    destroyAutorun1();

    // delete the entity
    prop.delete();
  }

});