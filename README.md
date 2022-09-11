# 使えません Cannot Use Under Construction
# navgoal_webgui
A WebGUI for publishing 2D Nav Goal

## Install

```shell
git clone https://github.com/Decwest/navgoal_webgui.git
rosdep update
sudo apt update
rosdep install -i --from-paths -y navgoal_webgui
```

Actually, rosdep install is equal to this

```shell
sudo apt update
sudo apt install -y ros-$ROS_DISTRO-roswww ros-$ROS_DISTRO-tf2-web-republisher
```


## WebGUI URL
- Browse in your local PC
    
    http://localhost:8085/navgoal_webgui/navgoal_publisher.html

- Browse in other PCs or tablets in the same network
    
    http://<your local pc's ip address>:8085/navgoal_webgui/navgoal_publisher.html
