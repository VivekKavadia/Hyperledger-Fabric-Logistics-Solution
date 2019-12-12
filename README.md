//TODO: Implement smart contract using Nodejs instead of Hyperledger Composer.

This is a pseudo Blockchain-IoT interface for logistics service providers.

In the example a blockchain network provides a means of recording and storing events which are critical to safe delivery of a shipment. For example - temperature and acceleration are critical factors for transporting food items.

The network consists of importer, exporters and shippers. Each entity gets a MSP card which allows them to access the blockchain network. IoT sensors fire events if threshold values are breached. The events then record the breached values and store them on the blockchain. Once a shipment is received by the importer the smart contract automatically deducts penalty amounts for every breach event. The final value is then transferred to the shipper and exporter.

**The ordering service uses Kafka and couchDB is used for the database**

To setup the Fabric network execute byfn.sh inside the network directory.
To deploy the the BNA on the Fabric network execute setup.sh inside the network directory.
CLI will be instantiated on peer0 of Infrastructure.

The "organisations" folder contains the following information
1) Composer - Files related to Hyperledger Composer like logic, permissions and model files
2) Gateway - Files related to endorsement policy and MSP card creation

The "network" folder holds the information to instantiate a 5 node blockchain network.
