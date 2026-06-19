# Chronos - Arbitrage Dashboard

A fast, lightweight visual interface for the Chronos trading engine. It uses a minimal black-and-white design to display live market data, execution logs, and profit tracking without slowing down the browser.

## How to Run It

There is no installation or setup required. 

To view the dashboard, simply double-click the `index.html` file to open it in any web browser. 

The application includes a built-in test mode that generates sample data the moment you open it, allowing you to see the charts and tables working immediately without needing a live server.

## Connecting the Live Server

When the backend code is ready, swapping out the test data for the live data stream is a quick process:

1. Open `app.js`.
2. Delete the `ChronosMockEngine` section entirely.
3. Scroll to the bottom of the file and delete the two lines that start the mock engine.
4. Uncomment the WebSocket section at the bottom and replace the URL with the actual backend address.

## Expected Data Format

The dashboard expects the backend to send messages in one of these two formats:

**1. Speed and Uptime Update**
```json
{
  "type": "METRICS_UPDATE",
  "data": { 
    "tps": 2845, 
    "uptimeSeconds": 142.5 
  }
}
