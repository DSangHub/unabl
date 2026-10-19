import {randomUUID} from 'node:crypto';
import {route,dataConfig,authenticate,uuid,check,fail} from '../lib/payment.js';
import {albumAccess,albumDetails,albumPlan,videoDetails,ALBUM_BUCKET,VIDEO_LIMIT} from '../lib/album.js';
export default route(async(req,res)=>{
 const {db,origin}=dataConfig(),user=await authenticate(req,db,origin),b=req.body||{};
 if(!uuid(b.event_id))fail('Choose a saved or published event.');
 const access=await albumAccess(db,user,b.event_id,b.access_code),{host,event}=access;let {album}=access;
 const action=b.action||'get';
 if(action==='save'){
  if(!host)fail('Only the event host can edit the album.',403);
  const details=albumDetails(b);
  if(album)album=check(await db.from('event_albums').update(details).eq('id',album.id).select().single());
  else {albumPlan(b.tier);album=check(await db.from('event_albums').insert({event_id:event.id,tier:b.tier,...details}).select().single());}
  return res.json({album,paid:access.paid,host});
 }
 if(!album)return res.json({album:null,host,paid:false,videos:[]});
 if(action==='get'){
  let videos=[];
  if(access.paid){const rows=check(await db.from('album_videos').select('id,user_id,sender_name,message,object_path,status,approved,created_at').eq('album_id',album.id).neq('status','removed').order('created_at',{ascending:true}));
   for(const row of rows){if(!host&&row.user_id!==user.id&&!(album.guest_view&&row.approved&&row.status==='ready'))continue;
    let url=null;if(row.status==='ready'){const signed=check(await db.storage.from(ALBUM_BUCKET).createSignedUrl(row.object_path,300));url=signed.signedUrl;}
    videos.push({id:row.id,sender_name:row.sender_name,message:row.message,status:row.status,approved:row.approved,own:row.user_id===user.id,url});
   }
  }
  return res.json({album,host,paid:access.paid,videos,limits:{videos:20,per_guest:2,max_bytes:VIDEO_LIMIT}});
 }
 if(!access.paid)fail('The host must purchase and activate this album before video uploads open.',409);
 if(action==='reserve'){
  const detail=videoDetails(b),id=randomUUID(),path=album.id+'/'+id+'.'+detail.extension;
  const reserved=await db.rpc('reserve_album_video',{album_key:album.id,video_key:id,sender_key:user.id,sender_label:detail.sender_name,greeting:detail.message,file_path:path});
  if(reserved.error)fail('Upload limit reached (20 per album, two per guest). Ask the host to remove an unused upload.',409);
  const signed=await db.storage.from(ALBUM_BUCKET).createSignedUploadUrl(path,{upsert:false});
  if(signed.error){check(await db.from('album_videos').update({status:'removed'}).eq('id',id));fail('Video storage is unavailable. Please try again.',503);}
  return res.json({video_id:id,path,token:signed.data.token,bucket:ALBUM_BUCKET});
 }
 if(!uuid(b.video_id))fail('Choose a video.');
 const video=check(await db.from('album_videos').select('*').eq('id',b.video_id).eq('album_id',album.id).neq('status','removed').maybeSingle());if(!video)fail('Video not found.',404);
 if(action==='complete'){
  if(video.user_id!==user.id)fail('Only the uploader can complete this upload.',403);
  if(video.status==='ready')return res.json({ok:true});
  const [folder,file]=video.object_path.split('/'),objects=check(await db.storage.from(ALBUM_BUCKET).list(folder,{search:file,limit:2})),object=objects.find(o=>o.name===file);
  if(!object||!object.metadata||Number(object.metadata.size)<1||Number(object.metadata.size)>VIDEO_LIMIT||!['video/mp4','video/webm','video/quicktime'].includes(object.metadata.mimetype))fail('Uploaded video is missing or invalid. Remove this upload and try again.',409);
  check(await db.from('album_videos').update({status:'ready',approved:host}).eq('id',video.id).eq('status','pending'));
 }else if(action==='approve'){
  if(!host)fail('Only the host can approve album pages.',403);if(video.status!=='ready')fail('Finish uploading first.');
  check(await db.from('album_videos').update({approved:b.approved===true}).eq('id',video.id));
 }else if(action==='remove'){
  if(!host&&video.user_id!==user.id)fail('Only the host or uploader can remove this video.',403);
  check(await db.from('album_videos').update({status:'removed',approved:false}).eq('id',video.id));
  const removed=await db.storage.from(ALBUM_BUCKET).remove([video.object_path]);if(removed.error)console.error('Album storage cleanup pending');
  // Hide first; never expose a removed page again. Outstanding playback URLs expire within five minutes.
 }else fail('Unknown album action.');
 res.json({ok:true});
});
