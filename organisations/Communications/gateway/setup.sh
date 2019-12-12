#!/bin/bash
export VERBOSE=false

function setupComposer() {
  CONNECTION_PROFILE=relianceConnection-Communications.yaml

  # Fetch the private key from crypto materials and use it to create the private key and certificate path
  CURRENT_DIR=$PWD
  cd crypto-config/peerOrganizations/communications.reliancenetwork.com/users/Admin@communications.reliancenetwork.com/msp/keystore/ || exit
  PRIV_KEY=$(ls *_sk)
  cd "$CURRENT_DIR" || exit
  PRIVATE_KEY=./crypto-config/peerOrganizations/communications.reliancenetwork.com/users/Admin@communications.reliancenetwork.com/msp/keystore/"${PRIV_KEY}"
  CERT=./crypto-config/peerOrganizations/communications.reliancenetwork.com/users/Admin@communications.reliancenetwork.com/msp/signcerts/Admin@communications.reliancenetwork.com-cert.pem
  CARDOUTPUT=PeerAdmin@reliancenetwork-communications.card

  # Create a new business network card for the administrator to use to deploy the composer business network to fabric network
  # TODO: Repeat this step for all organizations
  composer card create -p "$CONNECTION_PROFILE" -u PeerAdmin -c "$CERT" -k "$PRIVATE_KEY" -r PeerAdmin -r ChannelAdmin -f "$CARDOUTPUT"

  # Check if a card with the same name has previously been imported? If yes, remove it before importing a new one.
  if composer card list -c PeerAdmin@reliancenetwork-communications >/dev/null; then
    composer card delete -c PeerAdmin@reliancenetwork-communications
  fi

  # Import the business network card for Communications into the wallet
  # TODO: Repeat this step for all organizations
  composer card import -f PeerAdmin@reliancenetwork-communications.card --card PeerAdmin@reliancenetwork-communications
  composer card list
  echo "Hyperledger Composer PeerAdmin@reliancenetwork-communications card has been imported"

  # Remove the card file from filesystem after card has been imported to wallet
  # TODO: Repeat this step for all organizations
  rm PeerAdmin@reliancenetwork-communications.card

  # Create a composer business network archive (bna) based on the model and script file
#   cd ./composer || exit
#   composer archive create -t dir -n . -a dist/reliancenetwork.bna

  # Install the composer business network on fabric peer nodes for Communications
  # TODO: Repeat this step to install composer BBN on peers of all organizations
  composer network install --card PeerAdmin@reliancenetwork-communications --archiveFile ../../composer/reliancenetwork.bna

  # Retrieve certificates for a user [Vivek] to use as the business network administrator for Communications
  # TODO: Retrieve certificates for administrators of all organizations
  composer identity request -c PeerAdmin@reliancenetwork-communications -u admin -s adminpw -d vivek

  # Start the business network with user [Vivek] from Communications as the administrator allowing him to add new participants from their orgs.
  # TODO: Add the administrators from other orgs to this command
  composer network start -c PeerAdmin@reliancenetwork-communications -n reliancenetwork -V 0.0.1 -o endorsementPolicyFile=./endorsement-policy.json -A vivek -C vivek/admin-pub.pem

  # Create a business network card that Vivek can use to access the business network on behalf of Communications
  composer card create -p "$CONNECTION_PROFILE" -u vivek -n reliancenetwork -c vivek/admin-pub.pem -k vivek/admin-priv.pem

  # Check if a card with the same name has previously been imported? If yes, remove it before importing a new one.
  if composer card list -c vivek@reliancenetwork >/dev/null; then
    composer card delete -c vivek@reliancenetwork
  fi

  # Import the business network card into wallet for Communications admin user [Vivek]
  composer card import -f vivek@reliancenetwork.card

  # Ping the network using this card just created
  composer network ping -c vivek@reliancenetwork

  # Add a new participant (Communications Pay) as a Manufacturer to the business network
  composer participant add -c vivek@reliancenetwork -d '{"$class": "reliancenetwork.Exporter", "email": "a@b.cc", "address": "", "accountBalance": 0}'

  # Issue a new identity for the Communications Pay manufacturer
  composer identity issue -c vivek@reliancenetwork -f exporter.card -u exporter -a "resource:reliancenetwork.Exporter#a@b.cc"

  # Import the card for new Communications Pay user into wallet
  composer card import -f exporter.card

  # Test the business network access of Communications Pay user
  composer network ping -c exporter@reliancenetwork
}

setupComposer