/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 * @modified by Fumiya Ohnishi - fumiya-onishi@keio.jp
 */

var NAV2D = NAV2D || {
  REVISION : '0.5.0-SNAPSHOT'
};

/**
 * USE INTERNALLY. Resize an Image map when receive new dimension.
 *
 * @param old_state - Previous state
 * @param viewer - Viewer 2D
 * @param currentGrid - Current grid with information about width, height and position
 */
NAV2D.resizeMap = function(old_state, viewer, currentGrid) {
  if(!old_state){
    old_state = {
      width: currentGrid.width,
      height: currentGrid.height,
      x: currentGrid.pose.position.x,
      y: currentGrid.pose.position.y
    };
    viewer.scaleToDimensions(currentGrid.width, currentGrid.height);
    viewer.shift(currentGrid.pose.position.x, currentGrid.pose.position.y);
  }
  if (old_state.width !== currentGrid.width || old_state.height !== currentGrid.height) {
    viewer.scaleToDimensions(currentGrid.width, currentGrid.height);
    old_state.width = currentGrid.width;
    old_state.height = currentGrid.height;
  }
  if (old_state.x !== currentGrid.pose.position.x || old_state.y !== currentGrid.pose.position.y) {
    viewer.shift((currentGrid.pose.position.x - old_state.x)/1, (currentGrid.pose.position.y - old_state.y)/1);
    old_state.x = currentGrid.pose.position.x;
    old_state.y = currentGrid.pose.position.y;
  }
  return old_state;
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 * @author Raffaello Bonghi - raffaello.bonghi@officinerobotiche.it
 * @modified by Fumiya Ohnishi - fumiya-onishi@keio.jp
 */

/**
 * A navigator can be used to add click-to-navigate options to an object. If
 * withOrientation is set to true, the user can also specify the orientation of
 * the robot by clicking at the goal position and pointing into the desired
 * direction (while holding the button pressed).
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * use_tf (optional) - whther use tf or not
 *   * map_frame (optional) - map tf name
 *   * base_frame (optional) - robot tf name
 *   * robot_pose (optional) - the robot pose topic name
 *   * topicName (optional) - topic name of publishing PoseStamped msg
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: true)
 */
NAV2D.Navigator = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var use_tf = options.use_tf && true;
  var map_frame = options.map_frame || '/map';
  var base_frame = options.base_frame || '/base_link';
  var robot_pose = options.robot_pose || '/robot_pose';
  var topicName = options.topicName || '/move_base_simple/goal';
  var withOrientation = options.withOrientation && true;
  this.rootObject = options.rootObject || new createjs.Container();

  this.goalMarker = null;

  // setup the publisher
  var goalPub = new ROSLIB.Topic({
    ros : ros,
    name : topicName,
    messageType : 'geometry_msgs/PoseStamped'
  });

  // setup tfClient
  var tfClient = new ROSLIB.TFClient({
    ros: ros,
    fixedFrame: map_frame,
    angularThres: 0.01,
    transThres: 0.01
  });

  /**
   * Send a goal to the global_navigation.cpp with the given pose.
   *
   * @param pose - the goal pose
   */
  function sendGoal(pose) {
    // create a goal
    var goalmsg = new ROSLIB.Message({
      pose : pose
    });
    goalPub.publish(goalmsg);

    // create a marker for the goal
    if (that.goalMarker === null) {
      that.goalMarker = new ROS2D.NavigationArrow({
        size: 15,
        strokeSize: 1,
        fillColor: createjs.Graphics.getRGB(255, 64, 128, 0.66),
        pulse: false
      });
      that.rootObject.addChild(that.goalMarker);
    }
    that.goalMarker.x = pose.position.x;
    that.goalMarker.y = -pose.position.y;
    that.goalMarker.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
    that.goalMarker.scaleX = 1.0 / stage.scaleX;
    that.goalMarker.scaleY = 1.0 / stage.scaleY;
  }

  // get a handle to the stage
  var stage;
  if (that.rootObject instanceof createjs.Stage) {
    stage = that.rootObject;
  } else {
    stage = that.rootObject.getStage();
  }

  //enable touchscreen if the device supported
  var enable_touch = false;
  if (createjs.Touch.isSupported() === true){
    createjs.Touch.enable(stage, false, true);
    stage.preventSelection = false;
    enable_touch = true
  }

  // marker for the robot
  var robotMarker = null;
  robotMarker = new ROS2D.NavigationArrow({
    size : 15,
    strokeSize : 1,
    fillColor : createjs.Graphics.getRGB(255, 128, 0, 0.66),
    pulse : false
  });

  // wait for a pose to come in first
  robotMarker.visible = false;
  this.rootObject.addChild(robotMarker);
  var initScaleSet = false;

  var updateRobotPosition = function(pose, orientation) {
    // update the robots position on the map
    robotMarker.x = pose.x;
    robotMarker.y = -pose.y;
    if (!initScaleSet) {
      robotMarker.scaleX = 1.0 / stage.scaleX;
      robotMarker.scaleY = 1.0 / stage.scaleY;
      initScaleSet = true;
    }
    // change the angle
    robotMarker.rotation = stage.rosQuaternionToGlobalTheta(orientation);
    // Set visible
    robotMarker.visible = true;
  };

  if(use_tf === true) {
    tfClient.subscribe(base_frame, function(tf) {
      updateRobotPosition(tf.translation,tf.rotation);
    });
  } else {
    // setup a listener for the robot pose
    var poseListener = new ROSLIB.Topic({
      ros: ros,
      name: robot_pose,
      messageType: 'geometry_msgs/Pose',
      throttle_rate: 100
    });
    poseListener.subscribe(function(pose) {
      updateRobotPosition(pose.position,pose.orientation);
    });
  }
  
  if (withOrientation === false){
    // setup a double click listener (no orientation)
    this.rootObject.addEventListener('dblclick', function(event) {
      // convert to ROS coordinates
      var coords = stage.globalToRos(event.stageX, event.stageY);
      var pose = new ROSLIB.Pose({
        position : new ROSLIB.Vector3(coords)
      });
      // send the goal
      sendGoal(pose);
    });
  } else { // withOrientation === true
    // setup a click-and-point listener (with orientation)
    var position = null;
    var positionVec3 = null;
    var thetaRadians = 0;
    var thetaDegrees = 0;
    var orientationMarker = null;
    var mouseDown = false;
    var xDelta = 0;
    var yDelta = 0;

    var mouseEventHandler = function(event, mouseState) {

      if (mouseState === 'down'){
        // get position when mouse button is pressed down
        position = stage.globalToRos(event.stageX, event.stageY);
        positionVec3 = new ROSLIB.Vector3(position);
        mouseDown = true;
      }
      else if (mouseState === 'move'){
        // remove obsolete orientation marker
        that.rootObject.removeChild(orientationMarker);

        if ( mouseDown === true) {
          // if mouse button is held down:
          // - get current mouse position
          // - calulate direction between stored <position> and current position
          // - place orientation marker
          var currentPos = stage.globalToRos(event.stageX, event.stageY);
          var currentPosVec3 = new ROSLIB.Vector3(currentPos);

          orientationMarker = new ROS2D.NavigationArrow({
            size : 25,
            strokeSize : 1,
            fillColor : createjs.Graphics.getRGB(0, 255, 0, 0.66),
            pulse : false
          });

          xDelta =  currentPosVec3.x - positionVec3.x;
          yDelta =  currentPosVec3.y - positionVec3.y;

          thetaRadians  = Math.atan2(xDelta,yDelta);

          thetaDegrees = thetaRadians * (180.0 / Math.PI);

          if (thetaDegrees >= 0 && thetaDegrees <= 180) {
            thetaDegrees += 270;
          } else {
            thetaDegrees -= 90;
          }

          orientationMarker.x =  positionVec3.x;
          orientationMarker.y = -positionVec3.y;
          orientationMarker.rotation = thetaDegrees;
          orientationMarker.scaleX = 1.0 / stage.scaleX;
          orientationMarker.scaleY = 1.0 / stage.scaleY;

          that.rootObject.addChild(orientationMarker);
        }
      }
      else if (mouseState === 'up' && mouseDown) { // mouseState === 'up'
        // if mouse button is released
        // - get current mouse position (goalPos)
        // - calulate direction between stored <position> and goal position
        // - set pose with orientation
        // - send goal
        mouseDown = false;

        var goalPos = stage.globalToRos(event.stageX, event.stageY);

        var goalPosVec3 = new ROSLIB.Vector3(goalPos);

        xDelta =  goalPosVec3.x - positionVec3.x;
        yDelta =  goalPosVec3.y - positionVec3.y;

        thetaRadians  = Math.atan2(xDelta,yDelta);

        if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
          thetaRadians += (3 * Math.PI / 2);
        } else {
          thetaRadians -= (Math.PI/2);
        }

        var qz =  Math.sin(-thetaRadians/2.0);
        var qw =  Math.cos(-thetaRadians/2.0);

        var orientation = new ROSLIB.Quaternion({x:0, y:0, z:qz, w:qw});

        var pose = new ROSLIB.Pose({
          position :    positionVec3,
          orientation : orientation
        });
        // send the goal
        sendGoal(pose);
      }
    };

    var multitouch = false;

    this.rootObject.addEventListener('stagemousedown', function(event) {
      if (enable_touch){
        console.log(event.nativeEvent.targetTouches.length)
        var touch_num = event.nativeEvent.targetTouches.length;
        if (touch_num >= 2){
          //cancel goal and disable touch
          that.rootObject.removeChild(orientationMarker);
          multitouch = true;
          mouseDown = false;
          return;
        }
        event.nativeEvent.preventDefault();
      }
      mouseEventHandler(event,'down');
    });

    this.rootObject.addEventListener('stagemousemove', function(event) {
      if (enable_touch){
        console.log(event.nativeEvent.targetTouches.length)
        var touch_num = event.nativeEvent.targetTouches.length;
        if (touch_num >= 1 && multitouch){
          //cancel goal and disable touch
          that.rootObject.removeChild(orientationMarker);
          multitouch = true;
          mouseDown = false;
          return;
        }
      }
      mouseEventHandler(event,'move');
    });

    this.rootObject.addEventListener('stagemouseup', function(event) {
      if (enable_touch){
        console.log(event.nativeEvent.targetTouches.length)
        var touch_num = event.nativeEvent.targetTouches.length;
        if (touch_num >= 1 && multitouch){
          //cancel goal and disable touch
          that.rootObject.removeChild(orientationMarker);
          multitouch = true;
          mouseDown = false;
          return;
        }
        else if (touch_num === 0 && multitouch){
          multitouch = false;
          return;
        }
        event.nativeEvent.preventDefault();
      }
      mouseEventHandler(event,'up');
    });
    
  }
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 * @modified by Fumiya Ohnishi - fumiya-onishi@keio.jp
 */

/**
 * A OccupancyGridClientNav uses an OccupancyGridClient to create a map for use with a Navigator.
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * use_tf (optional) - whther use tf or not
 *   * map_frame (optional) - map tf name
 *   * base_frame (optional) - robot tf name
 *   * robot_pose (optional) - the robot pose topic name
 *   * topicName (optional) - topic name of publishing PoseStamped msg
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: true)
 *   * viewer - the main viewer to render to
 */
NAV2D.OccupancyGridClientNav = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var use_tf = options.use_tf && true;
  var map_frame = options.map_frame || '/map';
  var base_frame = options.base_frame || '/base_link';
  var map_topic = options.map_topic || '/map';
  var robot_pose = options.robot_pose || '/robot_pose';
  var topicName = options.topicName || '/move_base_simple/goal';
  var continuous = options.continuous;
  var rootObject = options.rootObject || new createjs.Container();
  var viewer = options.viewer;
  var withOrientation = options.withOrientation && true;
  var old_state = null;

  // setup a client to get the map
  var client = new ROS2D.OccupancyGridClient({
    ros : ros,
    rootObject : rootObject,
    continuous : continuous,
    topic : map_topic
  });

  var navigator = new NAV2D.Navigator({
    ros: ros,
    use_tf: use_tf,
    map_frame: map_frame,
    base_frame: base_frame,
    robot_pose : robot_pose,
    topicName : topicName,
    rootObject: rootObject,
    withOrientation: withOrientation,
  });

  client.on('change', function() {
    // scale the viewer to fit the map
    old_state = NAV2D.resizeMap(old_state, viewer, client.currentGrid);
  });
};
