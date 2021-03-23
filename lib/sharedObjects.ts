import { autorun, extendObservable, makeAutoObservable, runInAction, toJS } from "mobx";
import { observableDiff, applyChange } from "deep-diff";
import { Vector3 } from "fivem-js";

enum MsgType {
  New,
  Update,
  Delete
};

type PlayerAndPosition = {
  playerId: string;
  position: Vector3;
}

const dist = (vec1: Vector3, vec2: Vector3): number => ((vec1.x - vec2.x)**2) + ((vec1.y - vec2.y)**2) + ((vec1.z - vec2.z)**2);

const getPlayerPositions = () => {
  const activePlayers: PlayerAndPosition[]  = [];
  const numPlayers = GetNumPlayerIndices();
  for (let i = 0; i < numPlayers; i++) {
    const playerId = GetPlayerFromIndex(i);
    const ped = GetPlayerPed(playerId);
    const [x, y, z] = GetEntityCoords(ped);
    activePlayers.push({
      playerId,
      position: new Vector3(x, y, z)
    })
  }
  return activePlayers;
}

export const createNamespace = <T extends object>(namespace: string): any => {

  const sharedObjects = new Map<string, any>();
  return {
    getObject: (objectId: string) => sharedObjects.get(objectId),
    createObject: (objectId: string, location: Vector3, distance: number, obj: T) => {
      makeAutoObservable(obj);
      extendObservable(obj, {
        get json() {
          return toJS(obj)
        }
      });

      type TypeWithJson = T & { json: string };

      let oldData = (obj as TypeWithJson).json;

      let trackedPlayers: string[] = [];
      const distanceSquared = distance ** 2;

      const proximtyInterval = setInterval(() => {

        const playerPositions = getPlayerPositions();

        const nearby = playerPositions
          .filter(({ position }) => position && (dist(position, location) < distanceSquared))
          .map(({ playerId }) => playerId);
        const distant = playerPositions.filter(({ playerId }) => !nearby.includes(playerId));
        const newInRange = nearby.filter((playerId) => !trackedPlayers.includes(playerId));
        const leftRange = distant.filter((playerId) => trackedPlayers.includes(playerId));

        trackedPlayers = nearby;
        
        newInRange.forEach((playerId) => {
          emitNet(namespace, playerId, objectId, MsgType.New, (obj as TypeWithJson).json); 
        });

        leftRange.forEach((playerId) => {
          emitNet(namespace, playerId, objectId, MsgType.Delete, {}); 
        });

      }, 1000);

      const diffAutorun = autorun(() => {
        observableDiff(oldData, (obj as TypeWithJson).json, (diff: any) => {
          oldData = (obj as TypeWithJson).json;
          trackedPlayers.forEach((playerId) => {
            emitNet(namespace, playerId, objectId, MsgType.Update, diff); 
          });
          console.log(diff);
        })
      });

      const destroy = () => {
        diffAutorun();
        clearInterval(proximtyInterval);
        sharedObjects.delete(objectId);
        trackedPlayers.forEach((playerId) => {
          emitNet(namespace, playerId, objectId, MsgType.Delete, {}); 
        });
      }

      sharedObjects.set(objectId, obj);

      return {
        obj,
        destroy
      };
    }
  }
}


export const joinNamespace = <T>(namespace: string) => {

  // local store of objects
  const localObjects = new Map<string, any>();

  // local store of cleanup methods
  const cleanupMethods = new Map<string, Promise<() => void>>();

  return {
    getObject: (objectId: string) => localObjects.get(objectId),
    listen: (onNewObject: (objectId: string, data: T) => Promise<() => void>) => {

      // add a new listener for this namespace
      onNet(namespace, (objectId: string, msgType: MsgType, data: any) => {
        
        if (msgType === MsgType.New) {
          makeAutoObservable(data);
          localObjects.set(objectId, data);
          cleanupMethods.set(objectId, onNewObject(objectId, data));
        } else if (msgType == MsgType.Update) {
          if (localObjects.has(objectId)) {
            runInAction(() => applyChange(localObjects.get(objectId), null, data));
          }
        } else {
          localObjects.delete(objectId);
          if (cleanupMethods.has(objectId)) {
            Promise.resolve(cleanupMethods.get(objectId))
              .then((destroy) => {
                destroy();
                cleanupMethods.delete(objectId)
              });
          }
        }
      });
    } 
  }
} 
