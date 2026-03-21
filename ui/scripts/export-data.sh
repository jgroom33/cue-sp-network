#!/bin/bash
cd /home/jgroom/agent_rfc
~/go/bin/cue export . > ui/public/network-data.json
echo "Exported $(python3 -c 'import sys,json; d=json.load(open("ui/public/network-data.json")); print(len(d["network"]["device_configs"]))') devices"
