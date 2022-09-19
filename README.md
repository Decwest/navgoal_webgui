# Under Construction
This repository is based on [nav2djs](https://github.com/GT-RAIL/nav2djs)

# navgoal_webgui
A WebGUI for publishing 2D Nav Goal

## Install

```shell
git clone https://github.com/Decwest/navgoal_webgui.git
sudo apt update
sudo apt install -y ros-$ROS_DISTRO-roswww ros-$ROS_DISTRO-tf2-web-republisher
```
## Launch
```shell
roslaunch navgoal_webgui webserver.launch
```

## WebGUI URL
- Browse in your local PC
    
    http://localhost:8085/navgoal_webgui/index.html

- Browse in other PCs or tablets in the same network
    
    http://<your local pc's ip address>:8085/navgoal_webgui/index.html
