/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getAssetRegistry getFactory emit */
const nameSpace = `reliancenetwork`;

/**
 * Sample transaction processor function.
 * @param {reliancenetwork.ShipmentReceived} tx The sample transaction instance.
 * @transaction
 */
async function shipmentReceived(tx) {
     try {
          //Get the asset registry for the shipment.
          const shipmentRegistry = await getAssetRegistry(`${nameSpace}.Shipment`);
          //Get the asset registry for the contract.
          const contractRegistry = await getAssetRegistry(`${nameSpace}.Contract`);
          //Get the participant registry for the exporter.
          const exporterRegistry = await getParticipantRegistry(`${nameSpace}.Exporter`);
          //Get the participant registry for the importer.
          const importerRegistry = await getParticipantRegistry(`${nameSpace}.Importer`);
          //Get the participant registry for the shipper.
          const shipperRegistry = await getParticipantRegistry(`${nameSpace}.Shipper`);

          let shipmentId = tx.shipment.shipmentId;

          //Verify that given shipment exists
          let doesShipmentExist = await shipmentRegistry.exists(shipmentId);
          if (!doesShipmentExist) {
               throw (`Shipment ${shipmentId} does not exist`);
          }

          //Shipment status other than 'InTransit' can not be accepted
          if (tx.shipment.shipmentStatus != 'InTransit') {
               throw ('Shipment status is invalid');
          }

          let contractId = tx.shipment.contract.contractId;
          let exporterEmail = tx.shipment.contract.exporter.email;
          let importerEmail = tx.shipment.contract.importer.email;
          let shipperEmail = tx.shipment.contract.shipper.email;
          //Verify that given contract exists
          let doesContractExist = await contractRegistry.exists(contractId);
          if (!doesContractExist) {
               throw (`Contract ${contractId} does not exist`);
          }

          //Verify that given exporter exists
          let doesExporterExist = await exporterRegistry.exists(exporterEmail);
          if (!doesExporterExist) {
               throw (`Exporter ${exporterEmail} does not exist`);
          }

          //Verify that given importer exists
          let doesImporterExist = await importerRegistry.exists(importerEmail);
          if (!doesImporterExist) {
               throw (`Importer ${importerEmail} does not exist`);
          }

          //Verify that given shipper exists
          let doesShipperExist = await shipperRegistry.exists(shipperEmail);
          if (!doesShipperExist) {
               throw (`Shipper ${shipperEmail} does not exist`);
          }

          //Getting current date and time
          let currentDateTime = new Date();
          tx.shipment.contract.actualArrivalDateTime = currentDateTime;
          currentDateTime = currentDateTime.toISOString();
          //Getting date and time at which shipment arrived
          let arrivalDateTimeDeadline = new Date(tx.shipment.contract.arrivalDateTimeDeadline).toISOString();
          let totalPayout = 0;
          if (currentDateTime <= arrivalDateTimeDeadline) {
               //Shipment arrived before deadline so calculate total payout
               totalPayout = tx.shipment.unitCount * tx.shipment.contract.unitPrice;

               let maxAllowedTemperature = tx.shipment.contract.maxTemperature;
               let minAllowedTemperature = tx.shipment.contract.minTemperature;
               let maxAllowedAcceleration = tx.shipment.contract.maxAcceleration;

               //Calculating number of times temperature exceeded maximum as per contract
               let temperatureAboveMaxCount = 0;
               tx.shipment.temperature.forEach(temperatureReading => {
                    if (temperatureReading.temperature > maxAllowedTemperature) {
                         temperatureAboveMaxCount++;
                    }
               });

               //Calculating number of times temperature exceeded minimum as per contract
               let temperatureBelowMinCount = 0;
               tx.shipment.temperature.forEach(temperatureReading => {
                    if (temperatureReading.temperature < minAllowedTemperature) {
                         temperatureBelowMinCount++;
                    }
               });

               //Calculating number of times acceleration exceeded maximum as per contract
               let accelerationExceededCount = 0;
               tx.shipment.acceleration.forEach(accelerationReading => {
                    if (temperatureReading.accelerationX > maxAllowedAcceleration) {
                         accelerationExceededCount++;
                    }
                    if (temperatureReading.accelerationY > maxAllowedAcceleration) {
                         accelerationExceededCount++;
                    }
                    if (temperatureReading.accelerationZ > maxAllowedAcceleration) {
                         accelerationExceededCount++;
                    }
               })

               //Calculating temperature and acceleration penalty by multiplying count with corresponding penalty factor
               let temperaturePenalty = (temperatureAboveMaxCount * tx.shipment.contract.maxPenaltyFactor) +
                                        (temperatureBelowMinCount * tx.shipment.contract.minPenaltyFactor);
               let accelerationPenalty = accelerationExceededCount * tx.shipment.contract.accelerationPenaltyFactor;
               //Subtract penalty amount from total payout
               totalPayout -= temperaturePenalty - accelerationPenalty;
               //Total payout should not be less than 0
               totalPayout = Math.max(totalPayout, 0);

               //Updating account balance of participants
               //Shipper fees calculated as 20% of total shipment value
               tx.shipment.contract.importer.accountBalance -= totalPayout;
               tx.shipment.contract.exporter.accountBalance += totalPayout;
               tx.shipment.contract.shipper.accountBalance += 0.2 * totalPayout;
          } else {
               console.log('Shipment is late so total payout set to 0');
          }

          tx.shipment.shipmentStatus = 'Arrived';

          //Update the shipment in the participant registry.
          await shipmentRegistry.update(tx.shipment);
          //Update the contract in the participant registry.
          await contractRegistry.update(tx.shipment.contract);
          //Update the exporter in the participant registry.
          await exporterRegistry.update(tx.shipment.contract.exporter);
          //Update the importer in the participant registry.
          await importerRegistry.update(tx.shipment.contract.importer);
          //Update the shipper in the participant registry.
          await shipperRegistry.update(tx.shipment.contract.shipper);

          console.log(`Shipment ${shipmentId} has arrived`);

     } catch (e) {
          console.log(e);
     }
}

/**
 * Sample transaction processor function.
 * @param {reliancenetwork.TransportShipment} tx The sample transaction instance.
 * @transaction
 */
async function transportShipment(tx) {
     try {
          //Get the asset registry for the shipment.
          const shipmentRegistry = await getAssetRegistry(`${nameSpace}.Shipment`);

          //Verify that given shipment exists
          let doesShipmentExist = await shipmentRegistry.exists(tx.shipment.shipmentId);
          if (!doesShipmentExist) {
               throw (`Shipment ${tx.shipment.shipmentId} does not exist`);
          }

          //Shipment status other than 'Created' can not be accepted
          if (tx.shipment.shipmentStatus != 'Created') {
               throw ('Shipment status is invalid');
          }

          let totalPayout = tx.shipment.unitCount * tx.shipment.contract.unitPrice;
          if (tx.shipment.contract.importer.accountBalance < totalPayout) {
               throw (`Importer has insufficient account balance to pay for this shipment`);
          }

          tx.shipment.shipmentStatus = 'InTransit';
          console.log(`Shipment ${tx.shipment.shipmentId} is on its way`);

          //Update the shipment in the participant registry.
          return await shipmentRegistry.update(tx.shipment);

     } catch (e) {
          console.log(e);
     }
}

/**
 * Sample transaction processor function.
 * @param {reliancenetwork.AccelerationReading} tx The sample transaction instance.
 * @transaction
 */
async function accelerationReading(tx) {
     try {
          //Get the asset registry for the shipment.
          const shipmentRegistry = await getAssetRegistry(`${nameSpace}.Shipment`);

          let shipmentId = tx.shipment.shipmentId;
          //Verify that given shipment exists
          let doesShipmentExist = await shipmentRegistry.exists(shipmentId);
          if (!doesShipmentExist) {
               throw (`Shipment ${shipmentId} does not exist`);
          }

          //Shipment status other than 'InTransit' can not be accepted
          if (tx.shipment.shipmentStatus != 'InTransit') {
               throw ('Shipment status is invalid');
          }

          //Record the new acceleration reading and push it to the shipment asset
          const factory = getFactory();
          let newReading = factory.newConcept(nameSpace, 'AccelerationArray');
          newReading.latitude = tx.latitude;
          newReading.longitude = tx.longitude;
          newReading.accelerationX = tx.accelerationX;
          newReading.accelerationY = tx.accelerationY;
          newReading.accelerationZ = tx.accelerationZ;

          if (tx.shipment.acceleration === undefined) {
               tx.shipment.acceleration = new Array();
          }

          tx.shipment.acceleration.push(newReading);

          //Emit acceleration event if reading exceeds threshold value
          let maxAllowedAcceleration = tx.shipment.contract.maxAcceleration;
          if (Math.max(tx.accelerationX, tx.accelerationY, tx.accelerationZ) > maxAllowedAcceleration) {
               let accelerationThresholdEvent = factory.newEvent(nameSpace, 'AccelerationThresholdEvent');
               accelerationThresholdEvent.shipment = tx.shipment;
               accelerationThresholdEvent.latitude = tx.latitude;
               accelerationThresholdEvent.longitude = tx.longitude;
               accelerationThresholdEvent.readingDateTime = tx.readingDateTime;
               accelerationThresholdEvent.message = `Acceleration threshold exceeded`;
               accelerationThresholdEvent.accelerationX = tx.accelerationX;
               accelerationThresholdEvent.accelerationY = tx.accelerationY;
               accelerationThresholdEvent.accelerationZ = tx.accelerationZ;
               emit(accelerationThresholdEvent);
               console.log(`Acceleration threshold exceeded`);
          }

          console.log(`Acceleration reading recorded`);
          return await shipmentRegistry.update(tx.shipment);

     } catch (e) {
          console.log(e);
     }
}

/**
 * Sample transaction processor function.
 * @param {reliancenetwork.TemperatureReading} tx The sample transaction instance.
 * @transaction
 */
async function temperatureReading(tx) {
     try {
          //Get the asset registry for the shipment.
          const shipmentRegistry = await getAssetRegistry(`${nameSpace}.Shipment`);

          let shipmentId = tx.shipment.shipmentId;
          //Verify that given shipment exists
          let doesShipmentExist = await shipmentRegistry.exists(shipmentId);
          if (!doesShipmentExist) {
               throw (`Shipment ${shipmentId} does not exist`);
          }

          //Shipment status other than 'InTransit' can not be accepted
          if (tx.shipment.shipmentStatus != 'InTransit') {
               throw ('Shipment status is invalid');
          }

          //Record the new temperature reading and push it to the shipment asset
          const factory = getFactory();
          let newReading = factory.newConcept(nameSpace, 'TemperatureArray');
          newReading.latitude = tx.latitude;
          newReading.longitude = tx.longitude;
          newReading.temperature = tx.temperature;

          if (tx.shipment.temperature === undefined) {
               tx.shipment.temperature = new Array();
          }

          tx.shipment.temperature.push(newReading);

          //Emit temperature event if reading exceeds threshold value
          let maxAllowedTemperature = tx.shipment.contract.maxTemperature;
          let minAllowedTemperature = tx.shipment.contract.minTemperature;
          if (tx.temperature > maxAllowedTemperature || tx.temperature < minAllowedTemperature) {
               let temperatureThresholdEvent = factory.newEvent(nameSpace, 'TemperatureThresholdEvent');
               temperatureThresholdEvent.shipment = tx.shipment;
               temperatureThresholdEvent.latitude = tx.latitude;
               temperatureThresholdEvent.longitude = tx.longitude;
               temperatureThresholdEvent.readingDateTime = tx.readingDateTime;
               temperatureThresholdEvent.message = `Temperature threshold exceeded`;
               temperatureThresholdEvent.temperature = tx.temperature;
               emit(temperatureThresholdEvent);
               console.log(`Temperature threshold exceeded`);
          }

          console.log(`Temperature reading recorded`);
          return await shipmentRegistry.update(tx.shipment);

     } catch (e) {
          console.log(e);
     }
}

/**
 * Sample transaction processor function.
 * @param {reliancenetwork.GPSReading} tx The sample transaction instance.
 * @transaction
 */
async function GPSReading(tx) {
     try {
          //Get the asset registry for the shipment.
          const shipmentRegistry = await getAssetRegistry(`${nameSpace}.Shipment`);

          let shipmentId = tx.shipment.shipmentId;
          //Verify that given shipment exists
          let doesShipmentExist = await shipmentRegistry.exists(shipmentId);
          if (!doesShipmentExist) {
               throw (`Shipment ${shipmentId} does not exist`);
          }

          //Shipment status other than 'InTransit' can not be accepted
          if (tx.shipment.shipmentStatus != 'InTransit') {
               throw ('Shipment status is invalid');
          }

          //Record the new GPS reading and push it to the shipment asset
          const factory = getFactory();
          let newReading = factory.newConcept(nameSpace, 'GPSArray');
          newReading.latitude = tx.latitude;
          newReading.longitude = tx.longitude;
          newReading.latitudeDirection = tx.latitudeDirection;
          newReading.longitudeDirection = tx.longitudeDirection;

          if (tx.shipment.GPS === undefined) {
               tx.shipment.GPS = new Array();
          }

          tx.shipment.GPS.push(newReading);

          //If GPS reading is equal to coordinates of importer then emit 'ShipmentInPort' event
          let importerLatitude = tx.shipment.contract.importer.latitude;
          let importerLongitude = tx.shipment.contract.importer.longitude;
          if (tx.latitude === importerLatitude && tx.longitude === importerLongitude) {
               let shipmentInPortEvent = factory.newEvent(nameSpace, 'ShipmentInPort');
               shipmentInPortEvent.shipment = tx.shipment;
               shipmentInPortEvent.latitude = tx.latitude;
               shipmentInPortEvent.longitude = tx.longitude;
               shipmentInPortEvent.readingDateTime = tx.readingDateTime;
               shipmentInPortEvent.message = `Shipment in port`;
               emit(shipmentInPortEvent);
               console.log(`Shipment in port`);
          }

          console.log(`GPS reading recorded`);
          return await shipmentRegistry.update(tx.shipment);

     } catch (e) {
          console.log(e);
     }
}