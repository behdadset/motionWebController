import React from 'react'
import $ from 'jquery'


export default function News() {
  $.ajax('https://api.currentsapi.services/v1/latest-news?apiKey=wxxsReWlxfZzMYtQi-HCkKFEYXsIQm-PzK3ljEOX8NH4ZrfI').done(function(info){
    for (let i = 0; i <= 10; i++){
      if (`${info.news[i].image}` !== "None"){
        $('#fetch').after(`<h3 id="title${i}">${info.news[i].title}<h3>`);
        console.log(`${info.news[i].image}`)
        $(`#title${i}`).after(`<img id="img${i}" src="${info.news[i].image}"><img>`);
        $(`#img${i}`).after(`<a href="${info.news[i].url}" target="_blank">Read more...<a>`);
        console.log('working')
      }
    }
  }).fail(function() {
    console.log( "error" );
  })

  return (
    <div>
      
    </div>
  )
}


