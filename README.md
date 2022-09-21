# navgoal_webgui

<img src='https://user-images.githubusercontent.com/47899069/191579461-4bee0fa7-0bef-4636-a39b-b1ea4d462049.png' width="500" >

<div><video controls src="https://user-images.githubusercontent.com/47899069/191580812-bcdbfc4e-1572-4129-aeb7-3de3789e4ba0.mp4" muted="false" width="500"></video></div>

A WebGUI for publishing 2D Nav Goal (`geometry_msgs::PoseStamped`)

This code is based on [nav2djs](https://github.com/GT-RAIL/nav2djs)

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
    http://<your local PC's ip address>:8085/navgoal_webgui/index.html
    
    In Ubuntu, the ip address can be looked up as follows.

    ```shell
    hostname -I
    ```

## Parameter
You can change the topic and tf names by modifiying parameters [in the line 30 of index.html](https://github.com/Decwest/navgoal_webgui/blob/master/www/index.html#L30-L39).

```html
    //######################################################################################//
    //######################                  config                  ######################//
    //######################################################################################//
    var map_topic = '/map';
    var use_tf = true;
    var map_frame = '/map';
    var base_frame = '/base_link';
    var robot_pose = '/robot_pose';
    var topicName = '/move_base_simple/goal';
    //######################################################################################//
```

- **map_topic** (default: '/map')
  - the name of subscribing map topic (type: `nav_msgs/OccupancyGrid`)

- **use_tf** (default: true)
  - If true, the WebGUI obtains robot position by map_frame -> base_frame tf 
    - **map_frame** (default: '/map')
    - **base_frame** (default: '/base_link')
  - If false, the WebGUI obtains robot position by robot_pose topic (type: `geometry_msgs/Pose`)
    - **robot_pose** (default: '/robot_pose')
- **topicName** (default: '/move_base_simple/goal' (same as the default setting of RViz))
  - the name of publishing 2D nav goal topic (type: `geometry_msgs/PoseStamped`)
