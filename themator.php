<?php
/**
 * Plugin Name: Themator
 * Plugin URI:  https://github.com/teano/wp-themator
 * Description: Un constructeur de pages visuel premium avec mode plein écran et design fluide.
 * Version:     1.0.0
 * Author:      Teano
 * Text Domain: themator
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; 
}

define( 'THEMATOR_VERSION', '1.0.0' );
define( 'THEMATOR_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'THEMATOR_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

/**
 * Enqueue Admin Assets
 */
function themator_enqueue_admin_assets( $hook_suffix ) {
    if ( ! in_array( $hook_suffix, array( 'post.php', 'post-new.php' ) ) ) {
        return;
    }

    wp_enqueue_style(
        'themator-builder-css',
        plugins_url( 'assets/css/builder.css', __FILE__ ),
        array(),
        THEMATOR_VERSION
    );

    wp_enqueue_script(
        'themator-builder-js',
        plugins_url( 'assets/js/builder.js', __FILE__ ),
        array( 'jquery', 'jquery-ui-draggable' ),
        THEMATOR_VERSION,
        true
    );

    $post_id = 0;
    if ( isset( $_GET['post'] ) ) {
        $post_id = absint( $_GET['post'] );
    } elseif ( isset( $_POST['post_ID'] ) ) {
        $post_id = absint( $_POST['post_ID'] );
    }
    
    wp_localize_script( 'themator-builder-js', 'thematorData', array(
        'ajax_url'   => admin_url( 'admin-ajax.php' ),
        'nonce'      => wp_create_nonce( 'themator_builder_nonce' ),
        'saved_data' => $post_id ? get_post_meta( $post_id, '_themator_data', true ) : ''
    ) );
}
add_action( 'admin_enqueue_scripts', 'themator_enqueue_admin_assets' );

/**
 * Enqueue Frontend Assets
 */
function themator_enqueue_frontend_assets() {
    if ( is_singular() && get_post_meta( get_the_ID(), '_themator_active', true ) ) {
        wp_enqueue_style(
            'themator-frontend-css',
            plugins_url( 'assets/css/frontend.css', __FILE__ ),
            array(),
            THEMATOR_VERSION
        );
    }
}
add_action( 'wp_enqueue_scripts', 'themator_enqueue_frontend_assets' );

/**
 * Meta Box
 */
function themator_add_meta_box() {
    $screens = array( 'post', 'page' );
    foreach ( $screens as $screen ) {
        add_meta_box(
            'themator_meta_box',
            'Themator Builder',
            'themator_meta_box_html',
            $screen,
            'normal',
            'high'
        );
    }
}
add_action( 'add_meta_boxes', 'themator_add_meta_box' );

function themator_meta_box_html( $post ) {
    $value = get_post_meta( $post->ID, '_themator_data', true );
    $is_active = get_post_meta( $post->ID, '_themator_active', true );

    wp_nonce_field( 'themator_save_data', 'themator_meta_box_nonce' );
    ?>
    <div style="padding: 24px; text-align: center; background: #fff; border: 1px solid #ccd0d4; border-radius: 4px;">
        <h2 style="font-family: 'Open Sans', sans-serif; margin: 0 0 10px; font-weight: 700; color: #8f43ee;">Themator</h2>
        <p style="color: #646970; font-size: 14px; margin-bottom: 25px;">Ouvrez l'expérience de conception plein écran.</p>
        
        <button type="button" id="launch-themator-builder" class="button button-primary button-hero" style="background: #8f43ee; border-color: #7b32d9; padding: 12px 40px; font-weight: 600;">
            Activer Themator
        </button>

        <p style="margin-top: 20px;">
            <label>
                <input type="checkbox" name="themator_active" value="1" <?php checked( $is_active, '1' ); ?> />
                Rendre le contenu via Themator
            </label>
        </p>

        <input type="hidden" id="themator_data_input" name="themator_data" value="<?php echo esc_attr( $value ); ?>" />
        <input type="hidden" id="themator_html_input" name="themator_html" value="" />
    </div>

    <!-- UI Themator Overlay -->
    <div id="themator-builder-overlay" style="display: none;">
        <div class="tm-admin-bar">
            <span class="tm-admin-bar-logo">THEMATOR PRO</span>
            <button type="button" class="tm-exit-btn" id="tm-close-builder">Quitter l'éditeur</button>
        </div>

        <div class="tm-builder-topbar">
            <span class="tm-topbar-page-name">Themator Builder</span>
            <div class="tm-topbar-actions">
                <button type="button" class="tm-topbar-btn primary" id="tm-apply-builder">Enregistrer</button>
            </div>
        </div>

        <div class="tm-builder-canvas" id="tm-canvas"></div>

        <div class="tm-fab-container">
            <div class="tm-fab-menu" id="tm-fab-menu">
                <button type="button" class="tm-fab-action">🕒 Historique</button>
            </div>
            <button type="button" class="tm-fab-button" id="tm-fab-main-toggle">⋯</button>
        </div>

        <!-- Modal -->
        <div class="tm-modal" id="tm-settings-modal">
            <div class="tm-modal-header">
                <span class="tm-modal-title" id="tm-modal-title">Paramètres</span>
                <div class="tm-modal-header-actions">
                    <button type="button" class="tm-modal-close-btn" id="tm-modal-cancel">✕</button>
                    <button type="button" class="tm-modal-save-btn" id="tm-modal-save">✓</button>
                </div>
            </div>
            <div class="tm-modal-tabs">
                <button type="button" class="tm-modal-tab active">Contenu</button>
                <button type="button" class="tm-modal-tab">Style</button>
            </div>
            <div class="tm-modal-body" id="tm-modal-body"></div>
        </div>
    </div>
    <?php
}

/**
 * Save Data
 */
function themator_save_post( $post_id ) {
    if ( ! isset( $_POST['themator_meta_box_nonce'] ) || ! wp_verify_nonce( $_POST['themator_meta_box_nonce'], 'themator_save_data' ) ) return;
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( ! current_user_can( ( isset($_POST['post_type']) && 'page' === $_POST['post_type'] ? 'edit_page' : 'edit_post' ), $post_id ) ) return;

    if ( isset( $_POST['themator_data'] ) ) {
        $raw_data = wp_unslash( $_POST['themator_data'] );
        if ( ! empty( $raw_data ) && json_decode( $raw_data ) ) {
            update_post_meta( $post_id, '_themator_data', $raw_data );
        }
    }

    if ( isset( $_POST['themator_active'] ) ) {
        update_post_meta( $post_id, '_themator_active', '1' );
        if ( isset( $_POST['themator_html'] ) ) {
            remove_action( 'save_post', 'themator_save_post' );
            wp_update_post( array(
                'ID'           => $post_id,
                'post_content' => wp_kses_post( wp_unslash( $_POST['themator_html'] ) )
            ) );
            add_action( 'save_post', 'themator_save_post' );
        }
    } else {
        delete_post_meta( $post_id, '_themator_active' );
    }
}
add_action( 'save_post', 'themator_save_post' );

/**
 * Update System (GitHub)
 */
class ThematorUpdater {
    private $slug;
    private $pluginData;
    private $repo;
    private $githubAPIResult;

    public function __construct( $repo ) {
        $this->slug = plugin_basename( __FILE__ );
        $this->repo = $repo;
        add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'push_update' ] );
        add_filter( 'plugins_api', [ $this, 'plugin_popup' ], 10, 3 );
    }

    public function push_update( $transient ) {
        if ( empty( $transient->checked ) ) return $transient;
        $remote = $this->get_remote();
        if ( $remote && version_compare( THEMATOR_VERSION, $remote->tag_name, '<' ) ) {
            $obj = new stdClass();
            $obj->slug = 'themator';
            $obj->new_version = $remote->tag_name;
            $obj->package = $remote->assets[0]->browser_download_url;
            $transient->response[ $this->slug ] = $obj;
        }
        return $transient;
    }

    public function plugin_popup( $result, $action, $args ) {
        if ( 'plugin_information' !== $action || $args->slug !== 'themator' ) return $result;
        $remote = $this->get_remote();
        $obj = new stdClass();
        $obj->name = 'Themator';
        $obj->slug = 'themator';
        $obj->version = $remote->tag_name;
        $obj->last_updated = $remote->published_at;
        $obj->sections = [ 'description' => 'Themator Premium Builder Auto-Update.' ];
        $obj->download_link = $remote->assets[0]->browser_download_url;
        return $obj;
    }

    private function get_remote() {
        if ( $this->githubAPIResult ) return $this->githubAPIResult;
        $remote = wp_remote_get( "https://api.github.com/repos/{$this->repo}/releases/latest" );
        if ( ! is_wp_error( $remote ) && 200 === wp_remote_retrieve_response_code( $remote ) ) {
            $this->githubAPIResult = json_decode( wp_remote_retrieve_body( $remote ) );
        }
        return $this->githubAPIResult;
    }
}
new ThematorUpdater( 'teano/wp-themator' );
