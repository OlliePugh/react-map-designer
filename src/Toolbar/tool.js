import { ERROR_MESSAGES } from "../consts";
import { placeBlock } from "./utils";
const Tool = ({ toolName, setCurrentTool, tool, rotationRef, disabled }) => {
    return (
        <div style={{ border: "2px black solid" }}>
            <button
                key={toolName}
                onClick={() => {
                    setCurrentTool({
                        ...tool,
                        name: toolName,
                        trigger: (tiles, clickedPos, ignoredExceptions) => {
                            try {
                                return placeBlock(
                                    tiles,
                                    clickedPos,
                                    tool.dimensions,
                                    rotationRef,
                                    {
                                        ...tool,
                                        key: toolName,
                                        name: tool.name || toolName
                                    }
                                );
                            } catch (e) {
                                if (!ignoredExceptions?.includes(e.message)) {
                                    alert(ERROR_MESSAGES[e.message]);
                                }
                                return tiles;
                            }
                        }
                    });
                }}
                disabled={disabled}
            >
                {tool.name || toolName}
            </button>
        </div>
    );
};

export default Tool;
