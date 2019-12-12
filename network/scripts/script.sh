#!/bin/bash

echo
echo " ____    _____      _      ____    _____ "
echo "/ ___|  |_   _|    / \    |  _ \  |_   _|"
echo "\___ \    | |     / _ \   | |_) |   | |  "
echo " ___) |   | |    / ___ \  |  _ <    | |  "
echo "|____/    |_|   /_/   \_\ |_| \_\   |_|  "
echo
echo "Build your first network (BYFN) end-to-end test"
echo
CHANNEL_NAME="$1"
DELAY="$2"
LANGUAGE="$3"
TIMEOUT="$4"
VERBOSE="$5"
NO_CHAINCODE="$6"
: ${CHANNEL_NAME:="reliancenetwork"}
: ${DELAY:="3"}
: ${LANGUAGE:="golang"}
: ${TIMEOUT:="10"}
: ${VERBOSE:="false"}
: ${NO_CHAINCODE:="false"}
LANGUAGE=`echo "$LANGUAGE" | tr [:upper:] [:lower:]`
COUNTER=1
MAX_RETRY=10

CC_SRC_PATH="github.com/chaincode/chaincode_example02/go/"
if [ "$LANGUAGE" = "node" ]; then
	CC_SRC_PATH="/opt/gopath/src/github.com/chaincode/chaincode_example02/node/"
fi

if [ "$LANGUAGE" = "java" ]; then
	CC_SRC_PATH="/opt/gopath/src/github.com/chaincode/chaincode_example02/java/"
fi

echo "Channel name : "$CHANNEL_NAME

# import utils
. scripts/utils.sh

createChannel() {
	setGlobals 0 1

	if [ -z "$CORE_PEER_TLS_ENABLED" -o "$CORE_PEER_TLS_ENABLED" = "false" ]; then
                set -x
		peer channel create -o orderer.reliancenetwork.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx >&log.txt
		res=$?
                set +x
	else
				set -x
		peer channel create -o orderer.reliancenetwork.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&log.txt
		res=$?
				set +x
	fi
	cat log.txt
	verifyResult $res "Channel creation failed"
	echo "===================== Channel '$CHANNEL_NAME' created ===================== "
	echo
}

joinChannel () {
	for org in 1 2; do
	    for peer in 0 1; do
		joinChannelWithRetry $peer $org
		echo "===================== peer${peer}.org${org} joined channel '$CHANNEL_NAME' ===================== "
		sleep $DELAY
		echo
	    done
	done
}

## Create channel
echo "Creating channel..."
createChannel

## Join all the peers to the channel
echo "Having all peers join the channel..."
joinChannel

## Set the anchor peers for each org in the channel
echo "Updating anchor peers for infrastructure..."
updateAnchorPeers 0 1
echo "Updating anchor peers for power..."
updateAnchorPeers 0 2
echo "Updating anchor peers for communications..."
updateAnchorPeers 0 3
echo "Updating anchor peers for entertainment..."
updateAnchorPeers 0 4
echo "Updating anchor peers for capital..."
updateAnchorPeers 0 5

if [ "${NO_CHAINCODE}" != "true" ]; then

	echo "Installing chaincode on peer0.infrastructure..."
	installChaincode 0 1
	echo "Installing chaincode on peer1.infrastructure..."
	installChaincode 1 1
	echo "Install chaincode on peer0.power..."
	installChaincode 0 2
	echo "Install chaincode on peer1.power..."
	installChaincode 1 2
	echo "Install chaincode on peer0.communications..."
	installChaincode 0 3
	echo "Install chaincode on peer1.communications..."
	installChaincode 1 3
	echo "Install chaincode on peer0.entertainment..."
	installChaincode 0 4
	echo "Install chaincode on peer1.entertainment..."
	installChaincode 1 4
	echo "Install chaincode on peer0.capital..."
	installChaincode 0 5
	echo "Install chaincode on peer1.capital..."
	installChaincode 1 5

	echo "Instantiating chaincode on peer0.power..."
	instantiateChaincode 0 2

	echo "Querying chaincode on peer0.infrastructure..."
	chaincodeQuery 0 1 100

	echo "Sending invoke transaction on peer0.infrastructure peer0.power..."
	chaincodeInvoke 0 1 0 2

	echo "Querying chaincode on peer1.power..."
	chaincodeQuery 1 2 100
	
fi

echo
echo "========= All GOOD, BYFN execution completed =========== "
echo

echo
echo " _____   _   _   ____   "
echo "| ____| | \ | | |  _ \  "
echo "|  _|   |  \| | | | | | "
echo "| |___  | |\  | | |_| | "
echo "|_____| |_| \_| |____/  "
echo

exit 0
