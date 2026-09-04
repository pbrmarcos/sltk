import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "solutek-hub-mcp",
  title: "Solutek Hub MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Solutek Hub app. Use `echo` to verify connectivity. More tools can be added as needs arise.",
  tools: [echoTool],
});
