<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Statistiques
$pages_with_themator = get_posts( array(
    'post_type'      => 'any',
    'posts_per_page' => -1,
    'meta_key'       => '_themator_active',
    'meta_value'     => '1',
    'fields'         => 'ids',
) );
$total = count( $pages_with_themator );

// Layouts sauvegardés
$layouts = get_posts( array(
    'post_type'      => 'tmator_layout',
    'posts_per_page' => -1,
    'fields'         => 'ids',
) );
$total_layouts = count( $layouts );

// Dernière activité
$last_edited = get_posts( array(
    'post_type'      => array( 'page', 'post' ),
    'posts_per_page' => 5,
    'meta_key'       => '_themator_active',
    'meta_value'     => '1',
    'orderby'        => 'modified',
    'order'          => 'DESC',
) );
?>

<div class="themator-admin-wrap">
    <?php themator_admin_header( __( 'Tableau de bord', 'themator' ) ); ?>

    <!-- Stat Cards -->
    <div class="tm-card-grid">
        <div class="tm-card">
            <span class="tm-card-icon">📄</span>
            <div class="tm-card-title"><?php esc_html_e( 'Pages construites', 'themator' ); ?></div>
            <div class="tm-card-value"><?php echo esc_html( $total ); ?></div>
            <div class="tm-card-sub"><?php esc_html_e( 'pages/articles utilisant Themator', 'themator' ); ?></div>
        </div>
        <div class="tm-card">
            <span class="tm-card-icon">🗂️</span>
            <div class="tm-card-title"><?php esc_html_e( 'Modèles sauvegardés', 'themator' ); ?></div>
            <div class="tm-card-value"><?php echo esc_html( $total_layouts ); ?></div>
            <div class="tm-card-sub"><?php esc_html_e( 'dans votre bibliothèque', 'themator' ); ?></div>
        </div>
        <div class="tm-card">
            <span class="tm-card-icon">🚀</span>
            <div class="tm-card-title"><?php esc_html_e( 'Version', 'themator' ); ?></div>
            <div class="tm-card-value" style="font-size:22px;"><?php echo esc_html( THEMATOR_VERSION ); ?></div>
            <div class="tm-card-sub">
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=themator-updates' ) ); ?>"><?php esc_html_e( 'Vérifier les mises à jour →', 'themator' ); ?></a>
            </div>
        </div>
    </div>

    <!-- Actions rapides -->
    <div class="tm-admin-section">
        <h2>⚡ <?php esc_html_e( 'Actions rapides', 'themator' ); ?></h2>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <a href="<?php echo esc_url( admin_url( 'post-new.php?post_type=page' ) ); ?>" class="tm-btn tm-btn-primary">
                ＋ <?php esc_html_e( 'Nouvelle page', 'themator' ); ?>
            </a>
            <a href="<?php echo esc_url( admin_url( 'admin.php?page=themator-library' ) ); ?>" class="tm-btn tm-btn-secondary">
                🗂️ <?php esc_html_e( 'Bibliothèque', 'themator' ); ?>
            </a>
            <a href="<?php echo esc_url( admin_url( 'admin.php?page=themator-import-export' ) ); ?>" class="tm-btn tm-btn-secondary">
                ↕ <?php esc_html_e( 'Import / Export', 'themator' ); ?>
            </a>
            <a href="<?php echo esc_url( admin_url( 'admin.php?page=themator-options' ) ); ?>" class="tm-btn tm-btn-secondary">
                ⚙️ <?php esc_html_e( 'Options', 'themator' ); ?>
            </a>
        </div>
    </div>

    <!-- Dernières pages éditées -->
    <?php if ( $last_edited ) : ?>
    <div class="tm-admin-section">
        <h2>🕒 <?php esc_html_e( 'Dernières pages Themator modifiées', 'themator' ); ?></h2>
        <table class="tm-roles-table">
            <thead>
                <tr>
                    <th><?php esc_html_e( 'Page', 'themator' ); ?></th>
                    <th><?php esc_html_e( 'Type', 'themator' ); ?></th>
                    <th><?php esc_html_e( 'Modifié le', 'themator' ); ?></th>
                    <th><?php esc_html_e( 'Actions', 'themator' ); ?></th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ( $last_edited as $p ) : ?>
                <tr>
                    <td><strong><?php echo esc_html( $p->post_title ); ?></strong></td>
                    <td><?php echo esc_html( $p->post_type ); ?></td>
                    <td><?php echo esc_html( get_the_modified_date( 'd/m/Y H:i', $p ) ); ?></td>
                    <td>
                        <a href="<?php echo esc_url( get_edit_post_link( $p->ID ) ); ?>" class="tm-btn tm-btn-secondary" style="padding:5px 12px;font-size:12px;">
                            ✏️ <?php esc_html_e( 'Modifier', 'themator' ); ?>
                        </a>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>
