// UI feedback only; the matching database RLS policies are the authority.
window.MimoContacts = {
  async permissions(client,target) {
    const {data,error}=await client.rpc('mimo_contact_permissions',{target_user:target});
    if(error)throw error;
    if(!data||typeof data!=='object')throw new Error('Contact permissions unavailable');
    return data;
  },
  async allow(client,target,action) {
    try {
      const permissions=await this.permissions(client,target);
      if(permissions[action]===true)return true;
      alert('This action is unavailable because of privacy or blocking settings.');return false;
    } catch(error) {
      console.warn('Contact permission check failed',error);
      alert('Unable to check contact permissions. Please try again.');return false;
    }
  },
  async isBlocked(client,actor,target) {
    const {data,error}=await client.from('blocked_users').select('blocked_id').eq('blocker_id',actor).eq('blocked_id',target).maybeSingle();
    if(error)throw error;return !!data;
  },
  async setBlocked(client,actor,target,blocked) {
    if(!actor||!target||actor===target)throw new Error('Invalid contact');
    const query=blocked?client.from('blocked_users').upsert({blocker_id:actor,blocked_id:target},{onConflict:'blocker_id,blocked_id',ignoreDuplicates:true}):client.from('blocked_users').delete().eq('blocker_id',actor).eq('blocked_id',target);
    const {error}=await query;if(error)throw error;
  }
};
