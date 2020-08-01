import React, { Component } from 'react'
import Webcam from "react-webcam";
import $ from 'jquery'

export default class MotionDetection extends Component {

  componentDidMount(){

    const webcamElement = document.getElementById('webcam');
    const webcam = new Webcam(webcamElement, 'user')
    let lastImageData;
    let canvasSource = $("#canvas-source")[0];
    let canvasBlended = $("#canvas-blended")[0];
    let contextSource = canvasSource.getContext('2d');
    let contextBlended = canvasBlended.getContext('2d');
    let drums = {};

    contextSource.translate(canvasSource.width, 0);
    contextSource.scale(-1, 1);

    $("#webcam-switch").change(function () {
      if(this.checked){
          $('.md-modal').addClass('md-show');
          webcam.start()
              .then(result =>{
                cameraStarted();
                
                startMotionDetection();
              })  
      }
      else {        
          $("#errorMsg").addClass("d-none");
          webcam.stop();
          cameraStopped();
          setAllDrumReadyStatus(false);
      }        
    });

    $('.virtual-drum').on('load', function () {
        var viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        var ratioWidth = canvasBlended.width/viewWidth;
        var ratioHeight = canvasBlended.height/viewHeight;
        drums[this.attributes['vd-id'].value] = {
            id: this.attributes['vd-id'].value,
            name: this.attributes['name'].value,
            width: this.width * ratioWidth,
            height: this.height * ratioHeight,
            x: this.x * ratioWidth,
            y: this.y * ratioHeight
        }
    }).each(function() {
        if (this.complete) $(this).trigger('load');
    });
      

    function startMotionDetection() {   
        setAllDrumReadyStatus(false);
        update();
        setTimeout(setAllDrumReadyStatus, 1000, true);
    }

    function playHover(drum) {
      if (!drum.ready) return;
      
      playAnimate(drum);
      // throttle the note
      setTimeout(setDrumReady, 500, drum);
    }

    function setDrumReady(drum) {
      drum.ready = true;
    }

    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    function update() {
        drawVideo();
        blend();
        checkAreas();
    }

    function drawVideo() {
        contextSource.drawImage(webcamElement, 0, 0, webcamElement.width, webcamElement.height);
    }

    function blend() {
        var width = canvasSource.width;
        var height = canvasSource.height;
        // get webcam image data
        var sourceData = contextSource.getImageData(0, 0, width, height);
        // create an image if the previous image doesn’t exist
        if (!lastImageData) lastImageData = contextSource.getImageData(0, 0, width, height);
        // create a ImageData instance to receive the blended result
        var blendedData = contextSource.createImageData(width, height);
        // blend the 2 images
        differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
        // draw the result in a canvas
        contextBlended.putImageData(blendedData, 0, 0);
        // store the current webcam image
        lastImageData = sourceData;
    }

    function fastAbs(value) {
        //equal Math.abs
        return (value ^ (value >> 31)) - (value >> 31);
    }

    function threshold(value) {
        return (value > 0x15) ? 0xFF : 0;
    }

    function differenceAccuracy(target, data1, data2) {
        if (data1.length !== data2.length) return null;
        var i = 0;
        while (i < (data1.length * 0.25)) {
            var average1 = (data1[4*i] + data1[4*i+1] + data1[4*i+2]) / 3;
            var average2 = (data2[4*i] + data2[4*i+1] + data2[4*i+2]) / 3;
            var diff = threshold(fastAbs(average1 - average2));
            target[4*i] = diff;
            target[4*i+1] = diff;
            target[4*i+2] = diff;
            target[4*i+3] = 0xFF;
            ++i;
        }
    }
      

    function checkAreas() {
        // loop over the drum areas
        for (var drumName in drums) {
            var drum = drums[drumName];
            if(drum.x>0 || drum.y>0){
              var blendedData = contextBlended.getImageData(drum.x, drum.y, drum.width, drum.height);
              var i = 0;
              var average = 0;
              // loop over the pixels
              while (i < (blendedData.data.length * 0.25)) {
                  // make an average between the color channel
                  average += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]) / 3;
                  ++i;
              }
              // calculate an average between of the color values of the drum area
              average = Math.round(average / (blendedData.data.length * 0.25));
              if (average > 20) {
                  // over a small limit, consider that a movement is detected
                  // play a note and show a visual feedback to the user
                  //console.log(drum.name + '-' + average)
                  playHover(drum);          
              }
            }
        }
    }

    function playAnimate(drum){
      console.log(drum)
      if (drum.id === 'down'){
        window.scrollBy(0, 20)
      }else {
        window.scrollBy(0, -20)
      }
      
      var glowing = $("#"+drum.name+"-glowing");
      glowing.removeClass("d-none");
      glowing.height(glowing[0].clientWidth);
      setTimeout(function(){ 
        glowing.addClass("d-none");
        
      }, 500);
      
    }

    function setAllDrumReadyStatus(isReady){
      for (var drumName in drums) {
        drums[drumName].ready = isReady;
      }
    }

    function cameraStarted(){
      $("#errorMsg").addClass("d-none");
      $("#webcam-caption").html("  Right Up, Left Down");
      $("#webcam-control").removeClass("webcam-off");
      $("#webcam-control").addClass("webcam-on");
      $(".webcam-container").removeClass("d-none");
      $(canvasBlended).delay(600).fadeIn(); 
      $(".motion-cam").delay(600).fadeIn();
      $("#wpfront-scroll-top-container").addClass("d-none");
    }

    function cameraStopped(){
      $("#errorMsg").addClass("d-none");
      $("#webcam-control").removeClass("webcam-on");
      $("#webcam-control").addClass("webcam-off");
      $(".webcam-container").addClass("d-none");
      $("#webcam-caption").html("Click to Start Webcam");
      $('.md-modal').removeClass('md-show');
      
    }
  }
  render() {
    return (
      <div>
          <main id="motion-app">
              <div class="form-control webcam-start" id="webcam-control">
                      <label class="form-switch">
                        <input type="checkbox" id="webcam-switch" />
                        <i></i> 
                        <span id="webcam-caption">Click to Start Webcam</span>
                      </label>                        
              </div>
              <div id="errorMsg" class="col-12 alert-danger d-none">
              Fail to start camera 
              1. Please allow permission to access camera. 
              2. If you are browsing through social media built in browsers, look for the ... or browser icon on the right top/bottom corner, and open the page in Sarafi (iPhone)/ Chrome (Android)
              </div>
              
              <div class="md-modal md-effect-12">
                  <div class="app-panel md-content">            
                      <div class=" d-none">
                          <video id="webcam" autoplay playsinline width="640" height="480"></video>
                          <canvas id="canvas-source" width="640" height="480"></canvas>
                          <div class="motion-cam">
                              <canvas id="canvas-blended" width="640" height="480"></canvas>
                          </div>
                      </div>
                      <div class="drum-container">
                          <div class="row row-top">
                              
                          </div>
                          <div class="row row-bottom">
                              <div class="col-4 p-sm-3 p-0 d-none d-sm-inline">
                                  <img class="virtual-drum" src="images/Floor-Tom.png" name="floor-tom" vd-id='down' alt="" />
                                  <div class="spinner-grow text-primary d-none" role="status" id="floor-tom-glowing">
                                      <span class="sr-only">Loading...</span>
                                  </div>
                              </div>
                              <div class="col-5 p-sm-3 p-0">
                                  
                              </div>
                              <div class="col-3 p-sm-3 p-0 d-none d-sm-inline">
                                  <img class="virtual-drum" src="images/Snare.png" name="snare" vd-id='up' alt="" />
                                  <div class="spinner-grow text-primary d-none" role="status" id="snare-glowing">
                                      <span class="sr-only">Loading...</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  </div>
              <div class="md-overlay"></div>
          </main>
          <script src='js/motion-detection.js'></script>
          
          
          <div>
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
              Lorem ipsum dolor sit amet consectetur, adipisicing elit. Itaque error facere debitis officiis accusamus, amet vero. Doloremque cupiditate ea voluptas adipisci vero sed ipsa eligendi non, officiis sequi? Atque, et?
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quis dolorum quod tempora delectus impedit iure iste sed numquam totam temporibus repellat debitis laborum, sequi, accusamus vitae dolorem. Officiis, sit magnam?lore*10
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quis tenetur veritatis assumenda a quas quasi alias animi? Debitis quas eum corporis, modi quibusdam laborum accusantium. Expedita mollitia id optio blanditiis?
          </div>
      </div>
    )
  }
}
