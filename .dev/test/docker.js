import Docker from 'dockerode';
const docker = new Docker(); //defaults to above if env variables are not used

// docker.listContainers(function (err, containers) {
//     console.log(containers);
// });


await docker.pull('redis:alpine')
    .catch((err) => {
        console.error(err);
    });

console.log("******************************  Pull finished");

const images = await docker.listImages();
console.log(images);

const container = await docker.createContainer({
    Image: 'redis:alpine',
    name: 'redis',
    // HostConfig: { NetworkMode: 'ai_net' },
    // NetworkingConfig: {
    //     EndpointsConfig: { ['ai_net']: {} }
    // }
});
await container.start();