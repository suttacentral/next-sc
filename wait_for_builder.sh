#!/usr/bin/env bash
# Wait until frontend has finished building

status=1
while [ ${status} != 0 ]; do
    docker exec sc-frontend-builder cat /tmp/.done.info 2> /dev/null
    status=$?
    echo `status`
    if [ ${status} != 0 ]; then
        sleep 0.5
    fi
done
