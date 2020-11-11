# Run establish a ngrok tunnel


Sample: `test.yml`

```yml

name: Test

on: [push]

jobs:
  testsolaris:
    runs-on: macos-latest
    name: Test a ngrok tunnel
    env:
      NGROK_TOKEN : ${{ secrets.NGROK_TOKEN }}
    steps:
    - uses: actions/checkout@v2
    - name: Run establish a ngrok tunnel
      id: test
      uses: vmactions/ngrok-tunnel@v0.0.1
      with:
        protocol: tcp
        port: 22



```









