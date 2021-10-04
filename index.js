const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const fs = require("fs");
const path = require("path");
const os = require("os");
const { env } = require('process');


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


async function download() {
  NGROK_MAC = "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-darwin-amd64.zip"
  NGROK_Linux = "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip"
  NGROK_Win = "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip"
  NGROK_BSD = "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-freebsd-amd64.zip"


  let cmd="7za";
  let link = NGROK_Win;
  if (os.platform() == "darwin") {
    link = NGROK_MAC;
  } else if (os.platform() == "linux") {
    link = NGROK_Linux;
  } else {
    //
    cmd="7z.exe"
    //cmd = "c:\\\"Program Files\"\\7-zip\\7z.exe"
    process.env.path = process.env.path + ";c:/Program Files/7-zip"
  }


  let workingDir = __dirname;
  {
    core.info("Downloading: " + link);
    let img = await tc.downloadTool(link);
    core.info("Downloaded file: " + img);
    await io.mv(img, path.join(workingDir, "./ngrok.zip"));

  }

  await exec.exec(cmd + " e -y " + path.join(workingDir, "./ngrok.zip") + "  -o" + workingDir);


}

async function run(token, protocol, port) {
  let workingDir = __dirname;
  let ngrok = path.join(workingDir, "./ngrok")
  if (os.platform() == "win32") {
    ngrok = "ngrok.exe";
    process.env.path = process.env.path + ";" + workingDir;
  }

  await exec.exec(ngrok, ["authtoken", token]);

  let log = "ngrok.log";

  await exec.exec("sh", [], { input: `${ngrok} ${protocol} ${port} --log ${log} &` });

  await sleep(5000);


  let output = "";
  await exec.exec("sh", [], {
    input: `egrep -o  '${protocol}://.*ngrok.io.*' ${log} | head -1`,
    listeners: {
      stdout: (s) => {
        output += s;
        core.info(s);
      }
    }
  });


  if (protocol == "tcp") {
    let server = output.replace("tcp://", "").split(":")[0];
    core.info("server: " + server);
    core.setOutput("server", server);

    let port = output.replace("tcp://", "").split(":")[1];
    core.info("port: " + port);
    core.setOutput("port", port);

  } else if (protocol == "http") {
    let lines = output.split('//');
    let server = lines[lines.length - 1];
    core.info("server: " + server);
    core.setOutput("server", server);
  }

}



async function main() {
  let token = process.env['NGROK_TOKEN'];
  if (!token) {
    core.setFailed("No NGROK_TOKEN !");
    return;
  }

  let protocol = core.getInput("protocol");
  core.info("protocol: " + protocol);
  if (!protocol) {
    protocol = "tcp";
  }

  let port = core.getInput("port");
  core.info("port: " + port);
  if (!port) {
    core.setFailed("No port !");
    return;
  }


  var envs = core.getInput("envs");
  console.log("envs:" + envs);
  if (envs) {
    fs.appendFileSync(path.join(process.env["HOME"], "/.ssh/config"), "SendEnv " + envs + "\n");
  }

  var prepare = core.getInput("prepare");
  if (prepare) {
    core.info("Running prepare: " + prepare);
    await exec.exec("ssh -t solaris", [], { input: prepare });
  }


  await download();

  await run(token, protocol, port);


  process.exit();
}



main().catch(ex => {
  core.setFailed(ex.message);
});

