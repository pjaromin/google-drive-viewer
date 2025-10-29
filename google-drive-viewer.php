<?php
/**
 * Plugin Name: Google Drive Viewer (ZDL)
 * Description: In-page Google Drive folder browser using API Key (no OAuth). Shortcode: [google_drive_viewer key="resources"]
 * Version:     0.4.1
 * Author:      ZDL Pro
 * License:     GPL-2.0-or-later
 */

if (!defined('ABSPATH')) exit;

final class GDV_Plugin {
  const OPT        = 'gdv_options';
  const GROUP      = 'gdv_settings';
  const NS         = 'gdv/v1';
  const DBG_OPTION = 'gdv_debug_buffer'; // last ~50 log lines

  public function __construct() {
    add_action('admin_menu',        [$this,'admin_menu']);
    add_action('admin_init',        [$this,'register_settings']);
    add_shortcode('google_drive_viewer', [$this,'shortcode']);
    add_action('rest_api_init',     [$this,'register_routes']);
    add_action('wp_enqueue_scripts',[$this,'register_assets']);
  }

  /* ---------- Debug buffer (DB-based) ---------- */
  private function push_log($msg){
    $line = '[GDV] '.(is_scalar($msg) ? $msg : wp_json_encode($msg));
    $buf = get_option(self::DBG_OPTION, []);
    if (!is_array($buf)) $buf = [];
    $buf[] = $line;
    if (count($buf) > 50) $buf = array_slice($buf, -50);
    update_option(self::DBG_OPTION, $buf, false); // non-autoload
    // Also mirror to PHP error_log just in case host exposes it
    error_log($line);
  }
  private function dbg($msg){ $this->push_log($msg); }

  /* ---------- Defaults ---------- */
  private function defaults(){
    return [
      'api_key'      => '',
      'folder_map'   => [],
      'cache_ttl'    => 300,
      'restrict_cap' => '',
    ];
  }
  private function get_opts(){
    return wp_parse_args(get_option(self::OPT, []), $this->defaults());
  }

  /* ---------- Admin ---------- */
  public function admin_menu(){
    add_options_page('Google Drive Viewer', 'Google Drive Viewer', 'manage_options', 'google-drive-viewer', [$this,'render_settings']);
  }

  public function register_settings(){
    register_setting(self::GROUP, self::OPT, ['sanitize_callback'=>[$this,'sanitize']]);
  }

  public function sanitize($in){
    if (!is_array($in)) $in = [];
    $out = $this->get_opts();
    $out['api_key']      = sanitize_text_field($in['api_key'] ?? '');
    $out['cache_ttl']    = max(0, intval($in['cache_ttl'] ?? $out['cache_ttl']));
    $out['restrict_cap'] = sanitize_text_field($in['restrict_cap'] ?? '');

    $map = [];
    $map_raw = $in['folder_map'] ?? '';
    foreach (preg_split('/\r?\n/', (string)$map_raw) as $line){
      $line = trim($line);
      if (!$line || strpos($line,'=') === false) continue;
      [$k,$v] = array_map('trim', explode('=',$line,2));
      if ($k && $v) $map[$k] = $v;
    }
    $out['folder_map'] = $map;
    return $out;
  }

  public function render_settings(){
    if (!current_user_can('manage_options')) return;
    $o = $this->get_opts();
    $map_txt = '';
    foreach($o['folder_map'] as $k=>$v) $map_txt .= "$k=$v\n";
    ?>
    <div class="wrap">
      <h1>Google Drive Viewer (API Key)</h1>
      <form method="post" action="options.php">
        <?php settings_fields(self::GROUP); ?>
        <table class="form-table" role="presentation">
          <tr>
            <th>Google API Key</th>
            <td>
              <input type="text" class="regular-text" name="<?=esc_attr(self::OPT)?>[api_key]" value="<?=esc_attr($o['api_key'])?>">
              <p class="description">Create in Google Cloud → Credentials → API Key. For server-side calls, restrict by <strong>IP address</strong> (not referrer). Restrict API to <em>Google Drive API</em>.</p>
            </td>
          </tr>
          <tr>
            <th>Folder Map</th>
            <td>
              <textarea name="<?=esc_attr(self::OPT)?>[folder_map]" rows="6" class="large-text code" placeholder="resources=1AbCDef..."><?=esc_textarea($map_txt)?></textarea>
              <p class="description">One per line: <code>key=GOOGLE_DRIVE_FOLDER_ID</code> (ID is the long token after <code>/folders/</code> in the Drive URL).</p>
            </td>
          </tr>
          <tr>
            <th>Cache TTL (seconds)</th>
            <td><input type="number" name="<?=esc_attr(self::OPT)?>[cache_ttl]" value="<?=esc_attr($o['cache_ttl'])?>"></td>
          </tr>
          <tr>
            <th>Restrict Capability</th>
            <td><input type="text" name="<?=esc_attr(self::OPT)?>[restrict_cap]" value="<?=esc_attr($o['restrict_cap'])?>" placeholder="e.g. dealer"></td>
          </tr>
        </table>
        <?php submit_button(); ?>
      </form>
      <h2>Debug Buffer</h2>
      <p>The last 50 lines are stored in the database. Fetch via <code>/wp-json/<?=esc_html(self::NS)?>/debug</code>.</p>
    </div>
    <?php
  }

  /* ---------- Assets ---------- */
  public function register_assets(){
    wp_register_style ('gdv-css', plugins_url('assets/gdv.css',__FILE__), [], '0.4.1');
    wp_register_script('gdv-js',  plugins_url('assets/gdv.js', __FILE__), [], '0.4.1', true);
    add_action('elementor/editor/after_enqueue_scripts', function(){
      wp_enqueue_style('gdv-css'); wp_enqueue_script('gdv-js');
    });
  }

  /* ---------- Shortcode ---------- */
  public function shortcode($atts){
    $atts = shortcode_atts(['key'=>'','root_label'=>'Root','icon_theme'=>''], $atts);
    $o = $this->get_opts();

    if (!empty($o['restrict_cap']) && !current_user_can($o['restrict_cap']))
      return '<div class="gdv-denied">Access restricted.</div>';
    if (empty($o['api_key'])) return '<em>Google Drive Viewer: API key missing.</em>';

    $map = $o['folder_map'];
    $folderId = $map[$atts['key']] ?? '';
    if (!$folderId) return '<em>Folder key not found in settings.</em>';

    wp_enqueue_style('gdv-css'); wp_enqueue_script('gdv-js');
    wp_localize_script('gdv-js','GDV',[
      'rest'        => esc_url_raw(rest_url(self::NS.'/list')),
      'restDebug'   => esc_url_raw(rest_url(self::NS.'/debug')),
      'restPing'    => esc_url_raw(rest_url(self::NS.'/ping')),
      'restNonce'   => wp_create_nonce('wp_rest'),
      'apiKey'      => $o['api_key'],
      'rootFolder'  => $folderId,
      'cacheTTL'    => (int)$o['cache_ttl'],
      'rootLabel'   => $atts['root_label'],
      'iconTheme'   => $atts['icon_theme'],
    ]);

    return '<div class="gdv-browser" data-root="'.esc_attr($folderId).'" data-root-label="'.esc_attr($atts["root_label"]).'" data-icon-theme="'.esc_attr($atts["icon_theme"]).'">
      <div class="gdv gdv-fallback" style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;color:#6b7280;">
        Loading Google Drive Viewer…
      </div>
    </div>';
  }

  /* ---------- REST ---------- */
  public function register_routes(){
    // Health check
    register_rest_route(self::NS, '/ping', [
      'methods' => 'GET',
      'permission_callback' => function(WP_REST_Request $req){
        $nonce = $req->get_header('X-WP-Nonce');
        return wp_verify_nonce($nonce, 'wp_rest') ? true
          : new WP_Error('forbidden','Bad nonce',['status'=>403]);
      },
      'callback' => function(){ return rest_ensure_response(['ok'=>true,'ts'=>time()]); }
    ]);

    // Debug buffer
    register_rest_route(self::NS, '/debug', [
      'methods' => 'GET',
      'permission_callback' => function(WP_REST_Request $req){
        $nonce = $req->get_header('X-WP-Nonce');
        return wp_verify_nonce($nonce, 'wp_rest') ? true
          : new WP_Error('forbidden','Bad nonce',['status'=>403]);
      },
      'callback' => function(){
        $buf = get_option(self::DBG_OPTION, []);
        return rest_ensure_response(['log'=>$buf]);
      }
    ]);

    // List files/folders
    register_rest_route(self::NS, '/list', [
      'methods'  => 'GET',
      'args'     => [
        'folderId'  => ['required'=>true],
        'pageToken' => ['required'=>false],
      ],
      'permission_callback' => function(WP_REST_Request $req){
        $o = $this->get_opts();
        if (!empty($o['restrict_cap']) && !current_user_can($o['restrict_cap'])) {
          $this->dbg('403 capability fail user '.get_current_user_id());
          return new WP_Error('forbidden','Forbidden',['status'=>403]);
        }
        $nonce = $req->get_header('X-WP-Nonce');
        if (!wp_verify_nonce($nonce, 'wp_rest')) {
          $this->dbg('403 bad REST nonce');
          return new WP_Error('forbidden','Bad nonce',['status'=>403]);
        }
        return true;
      },
      'callback' => [$this,'api_list'],
    ]);
  }

  public function api_list(WP_REST_Request $req){
    $o = $this->get_opts();
    $folderId  = sanitize_text_field($req->get_param('folderId'));
    $pageToken = sanitize_text_field($req->get_param('pageToken') ?? '');

    $this->dbg('api_list start folderId='.$folderId.' pageToken='.$pageToken);

    $cache_key = 'gdv_'.md5($folderId.'|'.$pageToken);
    if ($o['cache_ttl'] > 0 && ($cached = get_transient($cache_key))) {
      $this->dbg('cache hit for '.$cache_key);
      return rest_ensure_response($cached);
    }

    // Build Drive query (Shared Drives supported)
    $params = [
      'q'        => sprintf("'%s' in parents and trashed=false", $folderId),
      'fields'   => 'nextPageToken, files(id,name,mimeType,modifiedTime,size,webViewLink,webContentLink,iconLink)',
      'pageSize' => 200,
      'orderBy'  => 'folder,name',
      'supportsAllDrives' => 'true',
      'includeItemsFromAllDrives' => 'true',
      'key'      => $o['api_key'],
    ];
    if (!empty($pageToken)) $params['pageToken'] = $pageToken;

    $url  = add_query_arg($params, 'https://www.googleapis.com/drive/v3/files');
    $this->dbg('Calling: '.$url);

    $resp = wp_remote_get($url, ['timeout'=>20]);

    if (is_wp_error($resp)) {
      $msg = $resp->get_error_message();
      $this->dbg('HTTP error: '.$msg);
      return new WP_Error('gdv_http','Request failed',[
        'status'=>500, 'detail'=>$msg, 'url'=>$url
      ]);
    }

    $code = wp_remote_retrieve_response_code($resp);
    $body = wp_remote_retrieve_body($resp);
    $this->dbg('Google response code='.$code.' | body='.substr($body,0,600));

    if ($code !== 200) {
      return new WP_Error('gdv_drive','Drive API error',[
        'status'=>$code, 'detail'=>substr($body,0,1200), 'url'=>$url
      ]);
    }

    $data = json_decode($body, true);
    $folders=[]; $files=[];
    foreach (($data['files'] ?? []) as $f){
      if (($f['mimeType'] ?? '') === 'application/vnd.google-apps.folder') $folders[]=$f; else $files[]=$f;
    }
    $out = [
      'nextPageToken' => $data['nextPageToken'] ?? '',
      'folders'       => $folders,
      'files'         => $files,
    ];
    if ($o['cache_ttl'] > 0) set_transient($cache_key, $out, (int)$o['cache_ttl']);
    return rest_ensure_response($out);
  }
}
new GDV_Plugin();
