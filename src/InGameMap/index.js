import { useEffect, useState, useRef } from "react";
import MapTile from "../MapTile";
import NonBlockEventsToolbar from "../NonBlockEventsToolbar";
import SOCKET_EVENTS from "../SOCKET_EVENTS";
import { CELL_WIDTH } from "../consts";
import Sidebar from "../Sidebar";

const InGameMap = ({ mapData, socketRef, isReady, children }) => {
    const [selectedEvent, setSelectedEvent] = useState();

    const [interactiveTiles, setInteractiveTiles] = useState({});
    const [runningNonTileBlocks, setRunningNonTileBlocks] = useState({});

    const [renderMapData, setRenderedMapData] = useState(
        JSON.parse(JSON.stringify(mapData))
    );

    const runningNonTileBlocksRef = useRef(runningNonTileBlocks);

    /* eslint-disable */
    useEffect(() => {
        const copyInteractiveTiles = { ...interactiveTiles };
        renderMapData.forEach((col, colNum) => {
            col.forEach((tile, rowNum) => {
                if (tile?.type.interaction) {
                    copyInteractiveTiles[`${colNum},${rowNum}`] = {
                        ...tile.type.interaction,
                        lastCalled: 0,
                        triggerable: true
                    };
                }
            });
        });
        setInteractiveTiles(copyInteractiveTiles);
    }, []);

    useEffect(() => {
        // TODO THIS IS JUST AWFUL - FIX THIS
        runningNonTileBlocksRef.current = runningNonTileBlocks;
    }, [runningNonTileBlocks]);

    // add a an adhoc event that is tied to a tile position
    const addNonTilePositionalEvent = (propKey) => {
        if (runningNonTileBlocks[selectedEvent.key]) {
            alert("That event is on a cooldown...");
            return;
        }

        const location = propKey.split(","); // add to the list of rendered tiles
        if (renderMapData[location[0]][location[1]]) {
            alert("That position is occupied!");
            return;
        }

        storeRunningNonTileBlock(selectedEvent, propKey);
        dispatchNonBlockEvent(selectedEvent, location); // dispatch the event to orch

        const copyRenderMapData = [...renderMapData];
        copyRenderMapData[location[0]][location[1]] = {
            parent: { col: location[0], row: location[1] },
            type: {
                name: selectedEvent.name || key,
                dimensions: { width: 1, height: 1 }
            },
            rotation: 0
        };

        setRenderedMapData(copyRenderMapData);

        setTimeout(() => {
            // TODO you might find that there is some funniness going on if there are multiple tile associted blocks and may need to use refs for the timeout
            // remove from the final render map
            const copyRenderMapData = [...renderMapData];
            copyRenderMapData[location[0]][location[1]] = JSON.parse(
                JSON.stringify(mapData[location[0]][location[1]])
            ); // set back to a copy of whatever it was before
            setRenderedMapData(copyRenderMapData);
        }, selectedEvent.frequency * 1000);
    };

    /* eslint-enable */
    const clickCallback = (propKey) => {
        if (selectedEvent) {
            addNonTilePositionalEvent(propKey);
            return; // do not try and trigger a tile event
        }
        const interactiveTileCopy = { ...interactiveTiles };
        const tile = interactiveTileCopy[propKey];
        if (!tile) {
            return;
        }

        if (tile.triggerable) {
            tile.triggerable = false;
            tile.lastCalled = Date.now();
            console.log(propKey);
            socketRef.current.emit(SOCKET_EVENTS.TRIGGER_EVENT, propKey);
            setTimeout(() => {
                // set it back to triggerable in the future
                const newCopy = { ...interactiveTiles };
                interactiveTileCopy[propKey].triggerable = true;
                setInteractiveTiles(newCopy);
            }, tile.frequency * 1000);
        }

        setInteractiveTiles(interactiveTileCopy);
    };

    const removeRunningNonTileBlock = (key) => {
        const copyRunningNonTileBlocks = { ...runningNonTileBlocksRef.current };
        delete copyRunningNonTileBlocks[key];
        setRunningNonTileBlocks(copyRunningNonTileBlocks);
    };

    const storeRunningNonTileBlock = (event, location = null) => {
        const copyRunningNonTileBlocks = { ...runningNonTileBlocks }; // add to the list of currently running events
        copyRunningNonTileBlocks[event.key] = {
            ...event,
            location
        };
        setRunningNonTileBlocks(copyRunningNonTileBlocks);
        setTimeout(() => {
            // set it back to triggerable in the future
            removeRunningNonTileBlock(event.key);
        }, event.frequency * 1000);
    };

    // dispatch an event to the server
    const dispatchNonBlockEvent = (event, location = null) => {
        if (!location) {
            storeRunningNonTileBlock(event);
        }
        const finalEvent = { ...event, location };
        console.log("dispatching", finalEvent);
        socketRef.current.emit(SOCKET_EVENTS.NONBLOCK_EVENT, finalEvent);
        setSelectedEvent();
    };

    return (
        <>
            <div
                style={{
                    display: "flex",
                    height: "100%",
                    ...(!isReady && {
                        // blur it out
                        filter: "blur(5px)",
                        msFilter: "blur(5px)",
                        WebkitFilter: "blur(5px)"
                    })
                }}
            >
                <Sidebar>
                    <NonBlockEventsToolbar
                        selectedEvent={selectedEvent}
                        setSelectedEvent={setSelectedEvent}
                        dispatchNonBlockEvent={dispatchNonBlockEvent}
                        runningNonTileBlocks={runningNonTileBlocks}
                    />
                </Sidebar>
                <div
                    style={{
                        width: renderMapData.length * CELL_WIDTH,
                        margin: "50px",
                        flex: 1,
                        overflow: "auto",
                        boxSizing: "border-box"
                    }}
                >
                    <div
                        style={{
                            display: "inline-grid",
                            boxSizing: "border-box",
                            position: "relative"
                        }}
                    >
                        {children}
                        {renderMapData.map((col, colNum) => {
                            return col.map((tile, rowNum) => {
                                const interactiveTile =
                                    interactiveTiles[`${colNum},${rowNum}`];
                                return (
                                    <MapTile
                                        modifyCallback={() => {
                                            clickCallback(
                                                `${colNum},${rowNum}`
                                            );
                                        }}
                                        cellWidth={CELL_WIDTH}
                                        data={tile}
                                        key={rowNum + "" + colNum}
                                        row={rowNum}
                                        col={colNum}
                                        colour={!!interactiveTile?.triggerable}
                                        style={{
                                            cursor: interactiveTile
                                                ? "pointer"
                                                : "auto"
                                        }}
                                        hoverData={
                                            selectedEvent &&
                                            !tile && {
                                                name:
                                                    selectedEvent?.name ||
                                                    selectedEvent?.key,
                                                style: {
                                                    backgroundColor: "red"
                                                }
                                            }
                                        }
                                    />
                                );
                            });
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};

export default InGameMap;
