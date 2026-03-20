<?php
/**
 * Plugin Name: Themator
 * Plugin URI:  https://github.com/TeALO36/wp-themator
 * Description: Un constructeur de pages visuel premium avec mode plein écran et design fluide.
 * Version:     1.1.0
 * Author:      Teano
 * Text Domain: themator
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; 
}

define( 'THEMATOR_VERSION', '1.1.0' );
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
                <button type="button" class="tm-modal-tab">Design</button>
                <button type="button" class="tm-modal-tab">Avancé</button>
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
        if ( $remote && isset( $remote->tag_name ) ) {
            $remote_version = ltrim( $remote->tag_name, 'v' );
            if ( version_compare( THEMATOR_VERSION, $remote_version, '<' ) ) {
                $obj = new stdClass();
                $obj->slug = 'themator';
                $obj->plugin = plugin_basename( __FILE__ );
                $obj->new_version = $remote_version;
                $obj->url = 'https://github.com/' . $this->repo;
                $obj->package = isset( $remote->assets[0] ) ? $remote->assets[0]->browser_download_url : '';
                $transient->response[ $this->slug ] = $obj;
            }
        }
        return $transient;
    }

    public function plugin_popup( $result, $action, $args ) {
        if ( 'plugin_information' !== $action || $args->slug !== 'themator' ) return $result;
        $remote = $this->get_remote();
        if ( ! $remote ) return $result;
        $obj = new stdClass();
        $obj->name = 'Themator';
        $obj->slug = 'themator';
        $obj->version = ltrim( $remote->tag_name, 'v' );
        $obj->last_updated = isset( $remote->published_at ) ? $remote->published_at : '';
        $obj->sections = [ 
            'description' => 'Themator Premium Builder Auto-Update.',
            'changelog' => wp_kses_post( isset( $remote->body ) ? $remote->body : '' )
        ];
        $obj->download_link = isset( $remote->assets[0] ) ? $remote->assets[0]->browser_download_url : '';
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
new ThematorUpdater( 'TeALO36/wp-themator' );

/**
 * ================================================================
 * ADMIN MENU (style Divi)
 * ================================================================
 */

/**
 * Header helper — rendered at top of each admin page
 */
function themator_admin_header( $page_title = '' ) {
    ?>
    <div class="tm-admin-header">
        <div class="tm-admin-header-logo">
            THEMATOR
            <?php if ( $page_title ) : ?>
                <span>/ <?php echo esc_html( $page_title ); ?></span>
            <?php endif; ?>
        </div>
        <span class="tm-admin-header-badge">Premium Builder</span>
        <span class="tm-admin-header-badge" style="background:rgba(0,226,99,0.25); color:#00e263;">
            v<?php echo esc_html( THEMATOR_VERSION ); ?>
        </span>
    </div>
    <?php
}

/**
 * Register top-level menu + sub-pages
 */
function themator_register_admin_menu() {
    // SVG icon (purple T)
    $icon = 'data:image/svg+xml;base64,' . base64_encode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><text y="16" font-size="16" font-family="Arial" font-weight="bold" fill="#a0a5aa">T</text></svg>' );

    add_menu_page(
        __( 'Themator', 'themator' ),
        __( 'Themator', 'themator' ),
        'edit_posts',
        'themator',
        'themator_page_dashboard',
        $icon,
        25
    );

    add_submenu_page( 'themator', __( 'Tableau de bord', 'themator' ), __( 'Tableau de bord', 'themator' ), 'edit_posts',    'themator',                'themator_page_dashboard' );
    add_submenu_page( 'themator', __( 'Options',         'themator' ), __( 'Options',         'themator' ), 'manage_options', 'themator-options',        'themator_page_options' );
    add_submenu_page( 'themator', __( 'Bibliothèque',    'themator' ), __( 'Bibliothèque',    'themator' ), 'edit_posts',    'themator-library',        'themator_page_library' );
    add_submenu_page( 'themator', __( 'Import / Export', 'themator' ), __( 'Import / Export', 'themator' ), 'manage_options', 'themator-import-export',  'themator_page_import_export' );
    add_submenu_page( 'themator', __( 'Mises à jour',   'themator' ), __( 'Mises à jour',   'themator' ), 'manage_options', 'themator-updates',        'themator_page_updates' );
}
add_action( 'admin_menu', 'themator_register_admin_menu' );

// Page callbacks
function themator_page_dashboard()     { include THEMATOR_PLUGIN_DIR . 'admin/page-dashboard.php'; }
function themator_page_options()       { include THEMATOR_PLUGIN_DIR . 'admin/page-options.php'; }
function themator_page_library()       { include THEMATOR_PLUGIN_DIR . 'admin/page-library.php'; }
function themator_page_import_export() { include THEMATOR_PLUGIN_DIR . 'admin/page-import-export.php'; }
function themator_page_updates()       { include THEMATOR_PLUGIN_DIR . 'admin/page-updates.php'; }

/**
 * Enqueue admin CSS on Themator pages
 */
function themator_enqueue_admin_panel_assets( $hook ) {
    $themator_pages = array(
        'toplevel_page_themator',
        'themator_page_themator-options',
        'themator_page_themator-library',
        'themator_page_themator-import-export',
        'themator_page_themator-updates',
    );
    if ( ! in_array( $hook, $themator_pages, true ) ) return;

    wp_enqueue_style(
        'themator-admin-css',
        plugins_url( 'assets/css/admin.css', __FILE__ ),
        array(),
        THEMATOR_VERSION
    );
}
add_action( 'admin_enqueue_scripts', 'themator_enqueue_admin_panel_assets' );

/**
 * Register "tmator_layout" Custom Post Type (for Bibliothèque)
 */
function themator_register_layout_cpt() {
    register_post_type( 'tmator_layout', array(
        'label'        => __( 'Modèles Themator', 'themator' ),
        'public'       => false,
        'show_ui'      => false,
        'show_in_menu' => false,
        'supports'     => array( 'title', 'custom-fields' ),
    ) );
}
add_action( 'init', 'themator_register_layout_cpt' );

/**
 * AJAX: Export layouts as JSON download
 */
function themator_ajax_export_layouts() {
    check_admin_referer( 'themator_export' );
    if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Unauthorized' );

    $layouts = get_posts( array(
        'post_type'      => 'tmator_layout',
        'posts_per_page' => -1,
    ) );

    $export = array( 'version' => THEMATOR_VERSION, 'layouts' => array() );
    foreach ( $layouts as $l ) {
        $export['layouts'][] = array(
            'title' => $l->post_title,
            'data'  => get_post_meta( $l->ID, '_themator_data', true ),
        );
    }

    $filename = 'themator-export-' . date( 'Y-m-d' ) . '.json';
    nocache_headers();
    header( 'Content-Type: application/json; charset=utf-8' );
    header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
    echo wp_json_encode( $export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );
    exit;
}
add_action( 'wp_ajax_themator_export_layouts', 'themator_ajax_export_layouts' );

/**
 * Inject custom CSS from Options into frontend <head>
 */
function themator_inject_custom_css() {
    $css = get_option( 'tmopt_custom_css', '' );
    if ( ! empty( $css ) ) {
        echo '<style id="themator-custom-css">' . wp_strip_all_tags( $css ) . '</style>';
    }
}
add_action( 'wp_head', 'themator_inject_custom_css' );
